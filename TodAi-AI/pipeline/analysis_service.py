"""TodAi 분석 서비스 — 미들웨어 뒤단의 Python 워커 + ADK 결과 저장기 (로컬 전체 파이프라인용).

이 한 프로세스가 세 가지 역할을 한다:
  1) emotion 워커  : todai.worker.emotion 큐 소비 -> 6-카테고리 음성감정 산출 -> reply 큐로 응답
  2) STT 워커      : todai.worker.stt 큐 소비     -> 표준어 텍스트 산출       -> reply 큐로 응답
  3) ADK 결과 저장기: 같은 correlation_id 의 emotion+stt 가 모이면 ADK 에이전트로 5지표 분석 ->
                     백엔드 내부 API(/api/internal/analysis-jobs/{job_id}/result)로 기록

미들웨어(Go)는 reply 큐를 별도로 소비해 job 최종 상태(completed)를 PATCH 한다. 즉 워커 응답은
미들웨어(상태추적)와 이 서비스(결과기록) 양쪽 목적을 동시에 만족시킨다 — 이 서비스는 자기가 두 결과를
모두 만들었으므로 내부적으로 집계해서 ADK 를 호출한다(reply 큐를 다시 소비하지 않는다).

설정(환경변수):
  RABBITMQ_URL        기본 amqp://guest:guest@localhost:5672/
  BACKEND_BASE_URL    기본 http://localhost:8080  (주의: /api 없이! 여기서 /api/internal 을 직접 붙인다)
  DEMO_ELDER_ID       기록을 연결할 어르신 id. 미설정 시 /api/main 의 첫 어르신 사용
                      (미들웨어 WS 핸들러가 session_id 를 서버 uuid 로 만들고 elder_id 를 빈값으로 보내기 때문)
  USE_REAL_EMOTION=1  실제 wav2vec2 모델로 감정 추론(오디오 필요, 1.2GB 로드). 기본은 결정적 mock.
"""
import base64
import json
import os
import re
import sys
import time

import pika
import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "ai_agent"))
from agent.agent import analyze_mental_health  # noqa: E402

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
BACKEND_BASE = os.getenv("BACKEND_BASE_URL", "http://localhost:8080").rstrip("/")
EMOTION_Q = os.getenv("RABBITMQ_EMOTION_QUEUE", "todai.worker.emotion")
STT_Q = os.getenv("RABBITMQ_STT_QUEUE", "todai.worker.stt")
REPLY_Q = os.getenv("RABBITMQ_REPLY_QUEUE", "todai.reply")
USE_REAL_EMOTION = os.getenv("USE_REAL_EMOTION") == "1"

EMOTION_LABELS = ["기쁨", "놀라움", "두려움", "사랑스러움", "슬픔", "화남"]

# correlation_id -> {job_id, session_id, elder_id, emotion, stt}
_pending: dict[str, dict] = {}
_emotion_recognizer = None


def _resolve_demo_elder_id() -> str:
    env = os.getenv("DEMO_ELDER_ID")
    if env:
        return env
    try:
        data = requests.get(f"{BACKEND_BASE}/api/main", timeout=5).json()["data"]
        if data:
            return str(data[0]["elder_id"])
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] could not resolve elder from /api/main: {exc}")
    return ""


DEMO_ELDER_ID = _resolve_demo_elder_id()


def _emotion_from_audio(audio_b64: str) -> dict:
    """6-카테고리 음성감정. USE_REAL_EMOTION=1 이면 실제 모델, 아니면 결정적 mock."""
    if USE_REAL_EMOTION and audio_b64:
        global _emotion_recognizer
        try:
            import io
            import wave
            import tempfile
            from emotion_model.infer import EmotionRecognizer

            if _emotion_recognizer is None:
                _emotion_recognizer = EmotionRecognizer()
            pcm = base64.b64decode(audio_b64)
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                with wave.open(tmp.name, "wb") as w:
                    w.setnchannels(1)
                    w.setsampwidth(2)
                    w.setframerate(16000)
                    w.writeframes(pcm)
                path = tmp.name
            out = _emotion_recognizer.predict(path)
            os.unlink(path)
            return out["probabilities"]
        except Exception as exc:  # noqa: BLE001
            print(f"[warn] real emotion failed, using mock: {exc}")
    # 결정적 mock — 슬픔/두려움 우세 (고위험 어르신 시나리오)
    return {"기쁨": 0.04, "놀라움": 0.06, "두려움": 0.20, "사랑스러움": 0.03, "슬픔": 0.54, "화남": 0.13}


def _stt_text(_audio_b64: str) -> str:
    """표준어 STT (mock). 실제로는 Whisper 사투리->표준어 워커가 채운다(GPU 필요)."""
    return "요즘 무릎이 아파서 병원에 자주 가요. 자식들은 멀리 살아서 며칠째 말동무가 없네요."


def _publish_reply(ch, req: dict, worker_type: str, result: dict):
    resp = {
        "job_id": req.get("job_id", ""),
        "session_id": req.get("session_id", ""),
        "elder_id": req.get("elder_id", ""),
        "correlation_id": req.get("correlation_id", ""),
        "worker_type": worker_type,
        "status": "success",
        "result": result,
        "timestamp": int(time.time() * 1000),
    }
    reply_to = req.get("reply_to") or REPLY_Q
    ch.basic_publish(
        exchange="",
        routing_key=reply_to,
        body=json.dumps(resp, ensure_ascii=False).encode("utf-8"),
        properties=pika.BasicProperties(content_type="application/json", delivery_mode=2),
    )
    print(f"  -> reply published | worker={worker_type} correlation={req.get('correlation_id')}")


def _elder_for(session_id: str, req_elder: str) -> str:
    if req_elder:
        return req_elder
    m = re.search(r"elder[-_]?(\d+)", session_id or "")
    if m:
        return m.group(1)
    return DEMO_ELDER_ID


def _try_record(corr_id: str):
    st = _pending.get(corr_id)
    if not st or "emotion" not in st or "stt" not in st:
        return
    job_id = st["job_id"]
    session_id = st["session_id"]
    elder_id = _elder_for(session_id, st.get("elder_id", ""))
    emotion_6 = st["emotion"]
    text = st["stt"]
    print(f"[ADK] correlation={corr_id} job_id={job_id} elder={elder_id} -> analyzing (6-cat emotion)")

    result = analyze_mental_health(
        session_id=session_id,
        text=text,
        emotion=json.dumps(emotion_6, ensure_ascii=False),
        conversation_history=json.dumps(
            [{"role": "assistant", "text": "오늘 어떻게 지내셨어요?", "timestamp": int(time.time()) - 60},
             {"role": "user", "text": text, "timestamp": int(time.time()) - 30}],
            ensure_ascii=False,
        ),
    )
    scores = result["scores"]
    # 에이전트 키 emotional_fluctuation -> 백엔드 metric 키 emotion_variance
    metrics = {
        "social_isolation": scores["social_isolation"],
        "health_anxiety": scores["health_anxiety"],
        "daily_vitality": scores["daily_vitality"],
        "emotion_variance": scores["emotional_fluctuation"],
        "cognitive_load": scores["cognitive_load"],
    }
    overall = round(sum(metrics.values()) / len(metrics), 2)
    resp = requests.post(
        f"{BACKEND_BASE}/api/internal/analysis-jobs/{job_id}/result",
        json={
            "session_id": session_id,
            "elder_id": elder_id,
            "correlation_id": corr_id,
            "job_status": "completed",
            "analysis_status": "SUCCESS",
            "adk_status": "SUCCESS",
            "stt_text": text,
            "metrics": metrics,
            "summary_text": "음성감정(슬픔/두려움 우세)과 대화에서 건강 불안·사회적 고립 신호가 관찰됨.",
            "overall_score": overall,
        },
        timeout=15,
    )
    if resp.ok:
        print(f"[RECORD] saved | {resp.json()}  scores={scores} overall={overall}")
    else:
        print(f"[RECORD][ERROR] {resp.status_code} {resp.text}")
    _pending.pop(corr_id, None)


def _on_emotion(ch, method, _props, body):
    req = json.loads(body)
    corr = req.get("correlation_id", "")
    print(f"[emotion] received | correlation={corr} job_id={req.get('job_id')}")
    emo = _emotion_from_audio(req.get("audio_data") or "")
    _publish_reply(ch, req, "emotion", emo)
    st = _pending.setdefault(corr, {})
    st.update({"job_id": req.get("job_id", ""), "session_id": req.get("session_id", ""),
               "elder_id": req.get("elder_id", ""), "emotion": emo})
    ch.basic_ack(delivery_tag=method.delivery_tag)
    _try_record(corr)


def _on_stt(ch, method, _props, body):
    req = json.loads(body)
    corr = req.get("correlation_id", "")
    print(f"[stt] received | correlation={corr} job_id={req.get('job_id')}")
    text = _stt_text(req.get("audio_data") or "")
    _publish_reply(ch, req, "stt", {"text": text})
    st = _pending.setdefault(corr, {})
    st.update({"job_id": req.get("job_id", ""), "session_id": req.get("session_id", ""),
               "elder_id": req.get("elder_id", ""), "stt": text})
    ch.basic_ack(delivery_tag=method.delivery_tag)
    _try_record(corr)


def main():
    params = pika.URLParameters(RABBITMQ_URL)
    conn = pika.BlockingConnection(params)
    ch = conn.channel()
    for q in (EMOTION_Q, STT_Q, REPLY_Q):
        ch.queue_declare(queue=q, durable=True)
    ch.basic_qos(prefetch_count=8)
    ch.basic_consume(queue=EMOTION_Q, on_message_callback=_on_emotion)
    ch.basic_consume(queue=STT_Q, on_message_callback=_on_stt)
    print(f"analysis_service up | backend={BACKEND_BASE} demo_elder={DEMO_ELDER_ID} "
          f"real_emotion={USE_REAL_EMOTION}")
    print(f"consuming: {EMOTION_Q}, {STT_Q} | replying to: {REPLY_Q}")
    try:
        ch.start_consuming()
    except KeyboardInterrupt:
        ch.stop_consuming()
        conn.close()


if __name__ == "__main__":
    main()
