"""말벗 '토닥이' 대답 생성 — 로컬 LLM(Ollama, OpenAI 호환 API) 사용.

프론트 채팅 서비스(reply_service.py)와 음성 파이프라인(analysis_service.py)이 공유한다.
Ollama 가 localhost:11434 에서 OpenAI 호환 엔드포인트를 제공하므로 기존 openai 클라이언트를 그대로 쓴다.

환경변수:
  OLLAMA_BASE_URL  기본 http://localhost:11434/v1
  REPLY_MODEL      기본 exaone3.5:7.8b (한국어 특화). qwen2.5:7b / gemma2:9b 등으로 교체 가능
"""
import os

from openai import OpenAI

OLLAMA_BASE = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
REPLY_MODEL = os.getenv("REPLY_MODEL", "exaone3.5:7.8b")

_client = OpenAI(base_url=OLLAMA_BASE, api_key="ollama")  # api_key 는 Ollama 가 무시

SYSTEM_PROMPT = """당신은 '토닥이'라는 이름의 다정한 AI 말벗입니다. 혼자 지내시는 어르신의 말동무가 되어드립니다.

말투와 태도:
- 항상 따뜻하고 공감하는 존댓말. ★반드시 2문장 이내, 전체 60자 안팎으로 아주 짧게 말합니다(음성으로 읽어주므로 길면 느려집니다).
- 어르신의 감정을 먼저 살펴 공감한 뒤, 자연스럽게 안부나 일상을 여쭙니다.
- 외로움·우울·통증 같은 신호가 보이면 더 따뜻하게 반응하고, 곁에 있다는 느낌을 줍니다.
- 의료·약 복용 등 전문적 판단은 단정하지 말고, 가족이나 복지사와 상의를 부드럽게 권합니다.
- 어려운 단어나 길고 복잡한 문장은 피합니다."""


def generate_reply(history, user_text: str, model: str | None = None, elder_id=None) -> str:
    """대화 기록 + 어르신 발화 -> 토닥이 대답.

    history: [{"role": "user"|"todak"|"assistant", "text": "..."}] (선택)
    elder_id: 주어지면 그 어르신의 누적 분석 지표를 컨텍스트로 주입(피드백 루프).
    """
    system = SYSTEM_PROMPT
    if elder_id is not None:
        try:
            from elder_context import context_prompt
            ctx = context_prompt(elder_id)
            if ctx:
                system = SYSTEM_PROMPT + "\n" + ctx
        except Exception:
            pass
    messages = [{"role": "system", "content": system}]
    for turn in (history or []):
        role = "assistant" if turn.get("role") in ("todak", "assistant") else "user"
        text = turn.get("text") or turn.get("content") or ""
        if text:
            messages.append({"role": role, "content": text})
    messages.append({"role": "user", "content": user_text})

    resp = _client.chat.completions.create(
        model=model or REPLY_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=110,
    )
    return resp.choices[0].message.content.strip()


if __name__ == "__main__":
    # 단독 테스트
    print(generate_reply([], "오늘 아무도 안 왔어요. 무릎도 아프고 영 외롭네요."))
