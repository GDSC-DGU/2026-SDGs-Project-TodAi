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
import threading
import time

import pika
import requests

# Windows 콘솔(cp949)로 한글 대답/STT 를 print 할 때 일부 자모(ᄒ 등)에서
# UnicodeEncodeError 로 콜백이 죽어 서비스가 크래시하던 것을 방지 — UTF-8(+replace) 강제.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        pass

sys.path.insert(0, os.path.dirname(__file__))  # pipeline/ (reply_llm)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "ai_agent"))
from agent.agent import analyze_mental_health  # noqa: E402
from adk_remote import analyze_remote  # noqa: E402  (배포된 Cloud Run 멀티에이전트)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
BACKEND_BASE = os.getenv("BACKEND_BASE_URL", "http://localhost:8080").rstrip("/")
EMOTION_Q = os.getenv("RABBITMQ_EMOTION_QUEUE", "todai.worker.emotion")
STT_Q = os.getenv("RABBITMQ_STT_QUEUE", "todai.worker.stt")
REPLY_Q = os.getenv("RABBITMQ_REPLY_QUEUE", "todai.reply")
USER_REPLY_Q = os.getenv("RABBITMQ_USER_REPLY_QUEUE", "todai.user.reply")  # 대답 -> 사용자 WS
USE_REAL_EMOTION = os.getenv("USE_REAL_EMOTION") == "1"
USE_REAL_STT = os.getenv("USE_REAL_STT") == "1"
USE_REPLY_LLM = os.getenv("USE_REPLY_LLM", "1") == "1"  # STT 후 말벗 대답 생성(로컬 Ollama)
USE_TTS = os.getenv("USE_TTS", "1") == "1"              # 대답을 음성(TTS)으로도 전달
USE_REMOTE_ADK = os.getenv("USE_REMOTE_ADK", "1") == "1"   # 배포된 Cloud Run 멀티에이전트로 5지표 분석
ADK_LOCAL_FALLBACK = os.getenv("ADK_LOCAL_FALLBACK", "1") == "1"  # 원격 실패 시 로컬 분석으로 폴백
ANALYZER_MODE = os.getenv("ANALYZER_MODE", "multi")    # 로컬 폴백 시 분석 모드(single|multi)
_tts = None

EMOTION_LABELS = ["기쁨", "놀라움", "두려움", "사랑스러움", "슬픔", "화남"]

# correlation_id -> {job_id, session_id, elder_id, emotion, stt}
_pending: dict[str, dict] = {}
_emotion_recognizer = None
_transcriber = None


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


_STT_MOCK = "요즘 무릎이 아파서 병원에 자주 가요. 자식들은 멀리 살아서 며칠째 말동무가 없네요."


def _stt_text(audio_b64: str) -> str:
    """표준어 STT. USE_REAL_STT=1 이면 학습 Whisper(siyeonsung/whisper-korean-dialect, GPU),
    아니면 고정 mock 텍스트."""
    if USE_REAL_STT and audio_b64:
        global _transcriber
        try:
            from stt_model.infer import DialectTranscriber
            if _transcriber is None:
                print("[stt] loading whisper-korean-dialect (first call, GPU)...")
                _transcriber = DialectTranscriber()
            pcm = base64.b64decode(audio_b64)
            _t = time.time()
            text = _transcriber.transcribe_pcm16(pcm)
            audio_sec = len(pcm) / 2 / 16000
            print(f"[stt] real transcription ({time.time()-_t:.1f}s, 오디오 {audio_sec:.1f}s): {text!r}")
            return text or _STT_MOCK
        except Exception as exc:  # noqa: BLE001
            print(f"[warn] real STT failed, using mock: {exc}")
    return _STT_MOCK


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


def _analyze(session_id: str, text: str, emotion_6: dict, history: list) -> dict:
    """5지표 분석. USE_REMOTE_ADK 면 배포된 Cloud Run 멀티에이전트 호출,
    실패하면(ADK_LOCAL_FALLBACK) 로컬 analyze_mental_health 로 폴백한다."""
    emotion_json = json.dumps(emotion_6, ensure_ascii=False)
    history_json = json.dumps(history, ensure_ascii=False)
    if USE_REMOTE_ADK:
        try:
            res = analyze_remote(session_id, text, emotion_json, history_json)
            print(f"[ADK/REMOTE] ok | mode={res.get('mode')}")
            return res
        except Exception as exc:  # noqa: BLE001
            print(f"[ADK/REMOTE][ERROR] {exc}")
            if not ADK_LOCAL_FALLBACK:
                raise
            print("[ADK] -> 로컬 분석으로 폴백")
    return analyze_mental_health(
        session_id=session_id,
        text=text,
        emotion=emotion_json,
        conversation_history=history_json,
        mode=ANALYZER_MODE,
    )


def _try_record(corr_id: str):
    """emotion+stt 가 모이면 SLOW 트랙 분석을 시작. ADK 호출이 ~70초 블로킹하므로
    pika I/O 루프를 막지 않도록 별도 스레드에서 실행한다(스레드는 pika 를 건드리지 않고
    HTTP 만 하므로 안전). 그렇지 않으면 긴 블로킹 동안 RabbitMQ 가 연결을 리셋해 죽는다."""
    st = _pending.get(corr_id)
    if not st or "emotion" not in st or "stt" not in st:
        return
    _pending.pop(corr_id, None)  # 한 번만 처리(claim)
    threading.Thread(target=_record_worker, args=(corr_id, st), daemon=True).start()


def _record_worker(corr_id: str, st: dict):
    job_id = st["job_id"]
    session_id = st["session_id"]
    elder_id = _elder_for(session_id, st.get("elder_id", ""))
    emotion_6 = st["emotion"]
    text = st["stt"]
    src = "REMOTE-ADK" if USE_REMOTE_ADK else "LOCAL"
    print(f"[SLOW/ADK:{src}] correlation={corr_id} job_id={job_id} elder={elder_id} -> analyzing (6-cat emotion)")
    try:
        history = [
            {"role": "assistant", "text": "오늘 어떻게 지내셨어요?", "timestamp": int(time.time()) - 60},
            {"role": "user", "text": text, "timestamp": int(time.time()) - 30},
        ]
        result = _analyze(session_id, text, emotion_6, history)
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
            timeout=120,
        )
        if resp.ok:
            print(f"[RECORD] saved | {resp.json()}  scores={scores} overall={overall}")
        else:
            print(f"[RECORD][ERROR] {resp.status_code} {resp.text}")
    except Exception as exc:  # noqa: BLE001  스레드 예외가 조용히 사라지지 않게
        print(f"[RECORD][ERROR] worker failed: {exc}")


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


def _tts_b64(text: str):
    """대답 텍스트 -> PCM16@16k base64 (로컬 한국어 TTS, GPU). 실패하면 None."""
    if not USE_TTS or not text:
        return None
    global _tts
    try:
        import base64 as _b64
        from tts import KoreanTTS
        if _tts is None:
            print("[tts] loading mms-tts-kor (first call, GPU)...")
            _tts = KoreanTTS()
        return _b64.b64encode(_tts.synth_to_pcm16(text)).decode()
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] TTS failed: {exc}")
        return None


def _fast_reply(ch, req: dict, text: str):
    """FAST TRACK — STT 도착 즉시 말벗 대답 생성(어르신 누적 지표 반영) + TTS 후 사용자 WS 로 전달.
    slow track(감정+ADK 분석)을 기다리지 않는다."""
    if not USE_REPLY_LLM:
        return
    session_id = req.get("session_id", "")
    elder_id = _elder_for(session_id, req.get("elder_id", ""))
    try:
        from reply_llm import generate_reply
        _t = time.time()
        reply = generate_reply([], text, elder_id=elder_id)
        llm_sec = time.time() - _t
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] fast reply failed (Ollama 확인): {exc}")
        return
    print(f"[FAST/REPLY] 토닥이 ({llm_sec:.1f}s) → {reply!r}  (elder={elder_id}, {len(reply)}자)")

    _t = time.time()
    audio_b64 = _tts_b64(reply)
    print(f"[FAST/TTS] {time.time()-_t:.1f}s (tts={'O' if audio_b64 else 'X'})")
    # 사용자 WS 로 보낼 대답을 user-reply 큐로 publish (미들웨어가 session_id 로 라우팅)
    payload = {"session_id": session_id, "text": reply,
               "audio_b64": audio_b64 or "", "sample_rate": 16000}
    ch.basic_publish(
        exchange="", routing_key=USER_REPLY_Q,
        body=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        properties=pika.BasicProperties(content_type="application/json", delivery_mode=2),
    )
    print(f"  -> user reply published | session={session_id} tts={'O' if audio_b64 else 'X'}")
    return reply


def _on_stt(ch, method, _props, body):
    req = json.loads(body)
    corr = req.get("correlation_id", "")
    print(f"[stt] received | correlation={corr} job_id={req.get('job_id')}")
    text = _stt_text(req.get("audio_data") or "")
    _fast_reply(ch, req, text)                   # ★ FAST TRACK: 즉시 대답(지표반영) + TTS -> WS
    _publish_reply(ch, req, "stt", {"text": text})
    st = _pending.setdefault(corr, {})
    st.update({"job_id": req.get("job_id", ""), "session_id": req.get("session_id", ""),
               "elder_id": req.get("elder_id", ""), "stt": text})
    ch.basic_ack(delivery_tag=method.delivery_tag)
    _try_record(corr)                            # SLOW TRACK: 분석은 emotion+stt 모이면


def main():
    params = pika.URLParameters(RABBITMQ_URL)
    # STT+LLM+TTS 가 콜백을 10~20초 블로킹하면 RabbitMQ 하트비트가 끊겨 연결이 닫히고
    # 다음 publish 에서 StreamLostError 로 죽는다. 하트비트를 끄고 블로킹 타임아웃을 늘린다.
    params.heartbeat = 0
    params.blocked_connection_timeout = 300
    conn = pika.BlockingConnection(params)
    ch = conn.channel()
    for q in (EMOTION_Q, STT_Q, REPLY_Q, USER_REPLY_Q):
        ch.queue_declare(queue=q, durable=True)
    ch.basic_qos(prefetch_count=8)
    ch.basic_consume(queue=EMOTION_Q, on_message_callback=_on_emotion)
    ch.basic_consume(queue=STT_Q, on_message_callback=_on_stt)
    adk_src = "remote(Cloud Run)" if USE_REMOTE_ADK else "local"
    print(f"analysis_service up | backend={BACKEND_BASE} demo_elder={DEMO_ELDER_ID} "
          f"real_emotion={USE_REAL_EMOTION} real_stt={USE_REAL_STT}")
    print(f"adk={adk_src} (fallback={ADK_LOCAL_FALLBACK}) | consuming: {EMOTION_Q}, {STT_Q} | replying to: {REPLY_Q}")
    try:
        ch.start_consuming()
    except KeyboardInterrupt:
        ch.stop_consuming()
        conn.close()


if __name__ == "__main__":
    main()
