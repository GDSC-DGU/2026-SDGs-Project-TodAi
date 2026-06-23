import json
import os
from openai import OpenAI
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm

# cwd 와 무관하게 ai_agent/.env 를 확실히 로드 (자격증명 누락 방지)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

ROUTING_MODEL = os.getenv("ROUTING_MODEL", "gemini-2.5-flash")
ANALYSIS_MODEL = os.getenv("ANALYSIS_MODEL", "gemini-3.5-flash")

# mindlogic 게이트웨이 크레딧 소진(402) 대응: GOOGLE_API_KEY 가 있으면 Gemini 를 직접 호출한다.
if os.getenv("USE_GEMINI_DIRECT", "1") == "1" and os.getenv("GOOGLE_API_KEY"):
    _client = OpenAI(
        api_key=os.getenv("GOOGLE_API_KEY"),
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )
    ANALYSIS_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")  # 실제 존재하는 모델로 강제
else:
    _client = OpenAI(
        api_key=os.getenv("API_KEY"),
        base_url=os.getenv("BASE_URL"),
    )

SCORE_CRITERIA = """
[채점 기준표]

1. 사회적 고립 (social_isolation)
91-100: 사회적 지지 체계가 견고하며 대인관계에서 깊은 정서적 교감을 나눔
81-90: 원만한 관계를 유지하나 스트레스 시 일시적으로 교류를 줄임
71-80: 관계의 폭이 좁아지기 시작함. 능동적인 사회 참여가 약간 감소
61-70: 불필요한 만남을 회피하며 대화의 주제가 일상적인 수준으로 제한됨
51-60: 가까운 가족 외에는 교류가 없으며 외로움을 만성적으로 느낌
41-50: 직장/학교 등 필수적인 사회적 역할 수행에 심각한 회피 반응 발생
31-40: 주 1회 미만의 외부 접촉. 타인과의 연결감이 단절되어 고립을 고착화함
21-30: 필수적인 대화조차 거부하거나 단답형으로 대응. 사회적 위축 심화
11-20: 최근 1개월간 타인과의 의미 있는 접촉 0회. 물리적/정서적 완전 고립
0-10: 실어증에 준하는 소통 거부. 사회적 존재로서의 기능 정지

2. 인지 부하 (cognitive_load)
91-100: 복잡한 정보 처리와 고도의 집중력이 요구되는 과업을 능숙히 수행함
81-90: 과로 시 사소한 실수를 하나 즉시 스스로 수정 가능함
71-80: 다중 작업 시 평소보다 능률이 떨어짐을 느낌
61-70: 새로운 정보를 학습하는 속도가 느려지며 메모에 의존하기 시작함
51-60: 일상적인 결정에도 상당한 심적 에너지가 소모됨
41-50: 대화의 맥락을 놓치거나 방금 하려던 일을 잊는 빈도가 급증함
31-40: 복잡한 문장 이해가 어렵고 익숙한 업무 수행에 타인의 조언이 필요함
21-30: 시간, 장소, 사람에 대한 지남력이 간헐적으로 흔들림
11-20: 기본적인 도구 사용법 망각. 짧은 지시사항 수행 불능
0-10: 언어 이해력 상실. 자신과 주변 환경에 대한 인지 기능 완전 마비

3. 감정 변동 (emotional_fluctuation)
91-100: 감정의 진폭이 안정적이며 부정적 감정도 적절한 방식으로 승화함
81-90: 감정 기복이 있으나 일상적인 수준이며 통제 가능함
71-80: 스트레스 상황에서 짜증이나 우울감이 평소보다 오래 지속됨
61-70: 감정의 변화가 외부로 표출되어 주변에서 기분 상태를 눈치챔
51-60: 사소한 자극에도 감정이 급격히 변하여 평정심 유지가 어려움
41-50: 기분의 고저가 일상생활의 계획을 바꿀 정도로 영향력이 커짐
31-40: 감정 폭발 혹은 극도의 침체가 빈번하며 스스로 통제할 수 없다고 느낌
21-30: 충동 조절 장애가 동반됨. 감정에 따른 위험 행동 가능성 증가
11-20: 현실 검증력이 상실된 수준의 극심한 정서적 혼란 및 자해 사고 빈번
0-10: 감정의 완전한 해체. 긴장증 혹은 극도의 격분 상태 지속

4. 일상 활력 (daily_vitality)
91-100: 에너지가 넘치며 목표 지향적인 활동에 능동적으로 참여함
81-90: 일상적 과업 수행에 문제가 없으나 주말에는 보충 휴식이 필요함
71-80: 의욕이 다소 감소하여 취미 활동이나 여가 생활이 줄어듦
61-70: 아침에 일어나기 힘들고 업무/학업 중 잦은 피로감을 느낌
51-60: 최소한의 의무만 수행함. 퇴근 후 모든 활동을 중단하고 휴식만 취함
41-50: 개인위생 관리가 소홀해지기 시작하며 외출을 꺼림
31-40: 식욕이 급감하거나 폭식함. 온종일 누워 있으나 피로가 풀리지 않음
21-30: 침대 밖을 벗어나는 것 자체가 불가능에 가깝게 느껴지는 중증 무기력
11-20: 기초적인 생존 활동에 타인의 전적인 도움 필요
0-10: 혼수 상태와 유사한 수준의 신체 에너지 고갈 및 반응 상실

5. 건강 불안 (health_anxiety)
91-100: 신체 상태를 객관적으로 인식하며 건강한 생활 습관을 유지함
81-90: 경미한 통증에 일시적으로 신경을 쓰나 진료 후 곧 안심함
71-80: 건강 정보에 민감해지며 자가 진단을 자주 검색함
61-70: 신체 변화를 질병의 신호로 해석하는 경향이 생겨 정기 검진에 집착함
51-60: 의사의 정상 판정에도 불구하고 다른 병원을 찾는 닥터쇼핑 시작
41-50: 건강에 대한 걱정으로 인해 식단, 활동 범위를 과도하게 제한함
31-40: 신체 증상에 대한 공포가 대화의 주를 이루며 사회적 관계를 저해함
21-30: 질병에 걸렸다는 확신으로 인해 일상 업무 수행이 중단됨
11-20: 망상 수준의 건강 염려. 신체 감각에 대한 극심한 공포로 일상 마비
0-10: 신체 기관의 기능 상실에 대한 기괴한 망상 및 공황 상태 지속

[주의] 20점 미만은 DSM-5 심도(Severe) 수준. 동일한 증상 수준에는 항상 동일한 점수 구간을 적용하세요.
"""

SYSTEM_PROMPT_SINGLE = f"""당신은 정신건강 및 생활 상태 분석 전문가입니다.
아래 데이터를 종합 분석하여 5개 지표에 대해 0~100 사이 정수 점수를 반환하세요.

{SCORE_CRITERIA}

반드시 JSON만 반환하세요. 설명 없이:
{{
  "social_isolation": <int>,
  "cognitive_load": <int>,
  "emotional_fluctuation": <int>,
  "daily_vitality": <int>,
  "health_anxiety": <int>
}}"""

AGENT_PROMPTS = {
    "social_isolation": f"""당신은 사회적 고립 분석 전문가입니다.
{SCORE_CRITERIA}
주어진 데이터에서 social_isolation 지표만 평가하세요.
아래 형식으로 반환하세요:
{{"score": <int>, "reason": "<근거>"}}""",

    "cognitive_load": f"""당신은 인지 부하 분석 전문가입니다.
{SCORE_CRITERIA}
주어진 데이터에서 cognitive_load 지표만 평가하세요.
아래 형식으로 반환하세요:
{{"score": <int>, "reason": "<근거>"}}""",

    "emotional_fluctuation": f"""당신은 감정 변동 분석 전문가입니다.
{SCORE_CRITERIA}
주어진 데이터에서 emotional_fluctuation 지표만 평가하세요.
아래 형식으로 반환하세요:
{{"score": <int>, "reason": "<근거>"}}""",

    "daily_vitality": f"""당신은 일상 활력 분석 전문가입니다.
{SCORE_CRITERIA}
주어진 데이터에서 daily_vitality 지표만 평가하세요.
아래 형식으로 반환하세요:
{{"score": <int>, "reason": "<근거>"}}""",

    "health_anxiety": f"""당신은 건강 불안 분석 전문가입니다.
{SCORE_CRITERIA}
주어진 데이터에서 health_anxiety 지표만 평가하세요.
아래 형식으로 반환하세요:
{{"score": <int>, "reason": "<근거>"}}""",
}

DEBATE_PROMPTS = {
    "social_isolation": f"""당신은 사회적 고립 분석 전문가입니다.
{SCORE_CRITERIA}
다른 전문가들의 1차 분석 결과를 참고하여 social_isolation 점수를 재검토하세요.
상충되거나 보완되는 부분이 있으면 반영하여 최종 점수를 확정하세요.
아래 형식으로 반환하세요:
{{"score": <int>, "reason": "<재검토 근거>"}}""",

    "cognitive_load": f"""당신은 인지 부하 분석 전문가입니다.
{SCORE_CRITERIA}
다른 전문가들의 1차 분석 결과를 참고하여 cognitive_load 점수를 재검토하세요.
상충되거나 보완되는 부분이 있으면 반영하여 최종 점수를 확정하세요.
아래 형식으로 반환하세요:
{{"score": <int>, "reason": "<재검토 근거>"}}""",

    "emotional_fluctuation": f"""당신은 감정 변동 분석 전문가입니다.
{SCORE_CRITERIA}
다른 전문가들의 1차 분석 결과를 참고하여 emotional_fluctuation 점수를 재검토하세요.
상충되거나 보완되는 부분이 있으면 반영하여 최종 점수를 확정하세요.
아래 형식으로 반환하세요:
{{"score": <int>, "reason": "<재검토 근거>"}}""",

    "daily_vitality": f"""당신은 일상 활력 분석 전문가입니다.
{SCORE_CRITERIA}
다른 전문가들의 1차 분석 결과를 참고하여 daily_vitality 점수를 재검토하세요.
상충되거나 보완되는 부분이 있으면 반영하여 최종 점수를 확정하세요.
아래 형식으로 반환하세요:
{{"score": <int>, "reason": "<재검토 근거>"}}""",

    "health_anxiety": f"""당신은 건강 불안 분석 전문가입니다.
{SCORE_CRITERIA}
다른 전문가들의 1차 분석 결과를 참고하여 health_anxiety 점수를 재검토하세요.
상충되거나 보완되는 부분이 있으면 반영하여 최종 점수를 확정하세요.
아래 형식으로 반환하세요:
{{"score": <int>, "reason": "<재검토 근거>"}}""",
}

JUDGE_PROMPT = f"""당신은 정신건강 분석 심사위원입니다.
{SCORE_CRITERIA}
전문가들의 1차 분석과 토론 후 재검토 결과를 모두 검토하고 최종 점수를 확정하세요.

반드시 JSON만 반환하세요. 설명 없이:
{{
  "social_isolation": <int>,
  "cognitive_load": <int>,
  "emotional_fluctuation": <int>,
  "daily_vitality": <int>,
  "health_anxiety": <int>
}}"""


def build_data_prompt(text: str, emotion: dict, conversation_history: list) -> str:
    history_text = "\n".join([
        f"[{turn['role']}] {turn['text']}"
        for turn in conversation_history
    ])
    return f"""대화 내용:
{history_text}

마지막 발화: {text}

음성 감정 분석:
{json.dumps(emotion, ensure_ascii=False, indent=2)}"""


def call_llm(system_prompt: str, user_prompt: str) -> str:
    response = _client.chat.completions.create(
        model=ANALYSIS_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
    )
    return response.choices[0].message.content


def analyze_single(text: str, emotion: dict, conversation_history: list) -> dict:
    prompt = build_data_prompt(text, emotion, conversation_history)
    raw = call_llm(SYSTEM_PROMPT_SINGLE, prompt)
    clean = raw.strip().removeprefix("```json").removesuffix("```").strip()
    return json.loads(clean)


def analyze_multi(text: str, emotion: dict, conversation_history: list) -> dict:
    data_prompt = build_data_prompt(text, emotion, conversation_history)

    # 1라운드: 전문가 5명 독립 분석
    round1 = {}
    for metric, system_prompt in AGENT_PROMPTS.items():
        raw = call_llm(system_prompt, data_prompt)
        clean = raw.strip().removeprefix("```json").removesuffix("```").strip()
        round1[metric] = json.loads(clean)

    # 2라운드: 전체 결과 공유 후 각자 재검토
    debate_context = f"""원본 데이터:
{data_prompt}

1차 전문가 분석 결과:
{json.dumps(round1, ensure_ascii=False, indent=2)}

위 결과를 참고하여 자신의 점수를 재검토하세요."""

    round2 = {}
    for metric, system_prompt in DEBATE_PROMPTS.items():
        raw = call_llm(system_prompt, debate_context)
        clean = raw.strip().removeprefix("```json").removesuffix("```").strip()
        round2[metric] = json.loads(clean)

    # 3라운드: judge 최종 확정
    judge_input = f"""원본 데이터:
{data_prompt}

1차 분석:
{json.dumps(round1, ensure_ascii=False, indent=2)}

토론 후 재검토:
{json.dumps(round2, ensure_ascii=False, indent=2)}"""

    final_raw = call_llm(JUDGE_PROMPT, judge_input)
    clean = final_raw.strip().removeprefix("```json").removesuffix("```").strip()
    return json.loads(clean)


def analyze_mental_health(
    session_id: str,
    text: str,
    emotion: str,
    conversation_history: str,
    mode: str = "single",
) -> dict:
    """
    정신건강 상태를 분석하여 5가지 지표 점수를 반환합니다.

    Args:
        session_id: 세션 ID
        text: 표준어 텍스트
        emotion: 음성 감정 데이터 (JSON 문자열)
        conversation_history: 대화 기록 (JSON 문자열)
        mode: 분석 모드 (single 또는 multi)

    Returns:
        5가지 지표 점수 딕셔너리
    """
    emotion_dict = json.loads(emotion) if isinstance(emotion, str) else emotion
    history_list = json.loads(conversation_history) if isinstance(conversation_history, str) else conversation_history
    if mode == "multi":
        scores = analyze_multi(text, emotion_dict, history_list)
    else:
        scores = analyze_single(text, emotion_dict, history_list)

    return {
        "session_id": session_id,
        "scores": scores,
        "mode": mode,
    }

root_agent = Agent(
    model=ROUTING_MODEL,  # gemini-2.5-flash
    name="mental_health_agent",
    description="정신건강 상태를 분석하여 5가지 지표 점수를 반환하는 에이전트",
    instruction="""당신은 정신건강 분석 에이전트입니다.
사용자가 데이터를 보내면 analyze_mental_health 툴을 호출하여 분석 결과를 반환하세요.
툴 호출 결과를 그대로 JSON으로 반환하세요.""",
    tools=[analyze_mental_health],
)