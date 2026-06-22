"""배포된 ADK 멀티에이전트(Cloud Run) 호출 클라이언트.

ADK 배포자가 준 스펙대로 호출한다:
  Base URL : https://adk-default-service-name-879430197170.asia-northeast3.run.app
  app_name : agent
  비공개(allow-unauthenticated=N) 서비스라 매 요청에 Google ID 토큰 필요 (audience = Base URL)

흐름:
  1) 세션 생성   POST /apps/{app}/users/{uid}/sessions/{sid}   body {}
  2) 분석 요청   POST /run   (new_message.parts[0].text = 분석 입력 JSON 문자열)
  3) 응답 = 이벤트 배열. 마지막 model 이벤트의 content.parts[].text 에 5지표 JSON 이 담김.

로컬에서 ID 토큰 얻는 법(우선순위):
  1) 환경변수 ADK_ID_TOKEN 에 토큰을 직접 넣음 (가장 간단, 단기 데모/테스트용)
  2) 서비스계정(GOOGLE_APPLICATION_CREDENTIALS) + google-auth -> fetch_id_token(audience)
  3) gcloud auth print-identity-token  (프로젝트 owner 계정 fallback)
운영(Spring)에서는 도는 환경의 서비스계정에 roles/run.invoker 부여 후 google-auth 가 자동 발급.
"""
import json
import os
import re
import subprocess
import time
import uuid

import requests

ADK_BASE = os.getenv(
    "ADK_BASE_URL",
    "https://adk-default-service-name-879430197170.asia-northeast3.run.app",
).rstrip("/")
ADK_APP = os.getenv("ADK_APP_NAME", "agent")
_AUDIENCE = ADK_BASE
_TIMEOUT = int(os.getenv("ADK_TIMEOUT", "120"))

_METRIC_KEYS = [
    "social_isolation",
    "cognitive_load",
    "emotional_fluctuation",
    "daily_vitality",
    "health_anxiety",
]

_token_cache = {"tok": None, "exp": 0.0}


def _mint_id_token() -> str:
    # 1) 직접 주입한 토큰
    tok = os.getenv("ADK_ID_TOKEN")
    if tok:
        return tok.strip()
    last = None
    # 2) google-auth ADC (서비스계정 권장)
    try:
        from google.auth.transport.requests import Request
        from google.oauth2 import id_token as gid

        return gid.fetch_id_token(Request(), _AUDIENCE)
    except Exception as exc:  # noqa: BLE001
        last = exc
    # 3) gcloud fallback (owner 계정)
    try:
        out = subprocess.run(
            ["gcloud", "auth", "print-identity-token"],
            capture_output=True,
            text=True,
            timeout=20,
            shell=(os.name == "nt"),
        )
        if out.returncode == 0 and out.stdout.strip():
            return out.stdout.strip()
        last = RuntimeError(out.stderr.strip() or "gcloud returned empty token")
    except Exception as exc:  # noqa: BLE001
        last = exc
    raise RuntimeError(
        f"ADK ID 토큰 발급 실패: {last}. ADK_ID_TOKEN 환경변수에 토큰을 넣거나 "
        "GOOGLE_APPLICATION_CREDENTIALS(run.invoker 서비스계정 키)를 설정하세요."
    )


def _id_token() -> str:
    if _token_cache["tok"] and time.time() < _token_cache["exp"]:
        return _token_cache["tok"]
    tok = _mint_id_token()
    _token_cache["tok"] = tok
    _token_cache["exp"] = time.time() + 50 * 60  # ID 토큰 ~1h, 여유 두고 캐시
    return tok


# gcloud run services proxy 로 띄운 로컬 프록시(http://localhost:PORT)면 프록시가 인증을
# 대신 주입하므로 우리는 토큰을 붙이지 않는다.
_IS_LOCAL_PROXY = bool(re.match(r"https?://(localhost|127\.0\.0\.1)(:|/|$)", ADK_BASE))


def _headers() -> dict:
    h = {"Content-Type": "application/json"}
    if not _IS_LOCAL_PROXY:
        h["Authorization"] = f"Bearer {_id_token()}"
    return h


def _create_session(user_id: str, session_id: str) -> None:
    url = f"{ADK_BASE}/apps/{ADK_APP}/users/{user_id}/sessions/{session_id}"
    r = requests.post(url, headers=_headers(), json={}, timeout=_TIMEOUT)
    if not r.ok and r.status_code not in (400, 409):  # 이미 존재 시 무시
        raise RuntimeError(f"세션 생성 실패 {r.status_code}: {r.text[:300]}")


def _find_scores(obj):
    """중첩 JSON 어디에 있든 5지표를 모두 가진 dict 를 재귀로 찾는다.
    배포 agent 는 tool 의 functionResponse.response.scores 또는 최종 텍스트의
    {"analyze_mental_health_response": {"scores": {...}}} 형태로 내보낸다."""
    if isinstance(obj, dict):
        if all(k in obj for k in _METRIC_KEYS):
            return {k: obj[k] for k in _METRIC_KEYS}
        for v in obj.values():
            r = _find_scores(v)
            if r:
                return r
    elif isinstance(obj, list):
        for v in obj:
            r = _find_scores(v)
            if r:
                return r
    return None


def _extract_scores(events) -> dict:
    """이벤트 배열에서 5지표를 추출. tool 의 functionResponse 를 최우선으로 본다."""
    if not isinstance(events, list):
        raise RuntimeError(f"예상치 못한 /run 응답: {str(events)[:300]}")
    # 1) 가장 신뢰: analyze_mental_health 툴의 functionResponse.response
    for ev in reversed(events):
        for part in ((ev or {}).get("content") or {}).get("parts") or []:
            fr = part.get("functionResponse") if isinstance(part, dict) else None
            if isinstance(fr, dict):
                r = _find_scores(fr.get("response"))
                if r:
                    return r
    # 2) 폴백: 마지막 model 텍스트 파트의 JSON(코드펜스/래퍼키 허용)
    for ev in reversed(events):
        content = (ev or {}).get("content") or {}
        if content.get("role") not in (None, "model"):
            continue
        for part in reversed(content.get("parts") or []):
            text = part.get("text") if isinstance(part, dict) else None
            if not text:
                continue
            clean = text.strip()
            clean = clean.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            obj = None
            try:
                obj = json.loads(clean)
            except json.JSONDecodeError:
                m = re.search(r"\{.*\}", clean, re.S)
                if m:
                    try:
                        obj = json.loads(m.group(0))
                    except json.JSONDecodeError:
                        obj = None
            r = _find_scores(obj)
            if r:
                return r
    raise RuntimeError("ADK 응답에서 5지표 JSON 을 찾지 못함")


def analyze_remote(
    session_id: str,
    text: str,
    emotion,
    conversation_history,
    user_id: str | None = None,
) -> dict:
    """배포된 ADK 로 5지표 분석. analyze_mental_health 와 동일한 반환 형태."""
    emotion_dict = json.loads(emotion) if isinstance(emotion, str) else emotion
    history = (
        json.loads(conversation_history)
        if isinstance(conversation_history, str)
        else conversation_history
    )
    user_id = (user_id or f"todai-{session_id}" or "todai")[:60]
    adk_sid = uuid.uuid4().hex  # 분석마다 새 세션 (히스토리는 payload 로 전달)

    _create_session(user_id, adk_sid)

    analysis_input = json.dumps(
        {
            "session_id": session_id,
            "emotion": emotion_dict,
            "text": text,
            "conversation_history": history,
        },
        ensure_ascii=False,
    )
    body = {
        "app_name": ADK_APP,
        "user_id": user_id,
        "session_id": adk_sid,
        "new_message": {"role": "user", "parts": [{"text": analysis_input}]},
    }
    r = requests.post(f"{ADK_BASE}/run", headers=_headers(), json=body, timeout=_TIMEOUT)
    if not r.ok:
        raise RuntimeError(f"/run 실패 {r.status_code}: {r.text[:300]}")
    scores = _extract_scores(r.json())
    return {"session_id": session_id, "scores": scores, "mode": "remote-multi"}


if __name__ == "__main__":  # 간단 단독 테스트
    demo = analyze_remote(
        session_id="local-test",
        text="요즘 통 입맛도 없고 사람 만나기가 싫네.",
        emotion={"슬픔": 0.6, "두려움": 0.2, "화남": 0.1, "기쁨": 0.05,
                 "놀라움": 0.03, "사랑스러움": 0.02},
        conversation_history=[],
    )
    print(json.dumps(demo, ensure_ascii=False, indent=2))
