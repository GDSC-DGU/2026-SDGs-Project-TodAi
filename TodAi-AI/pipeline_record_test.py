"""End-to-end 기록 파이프라인 테스트 (로컬 시연용).

미들웨어 오케스트레이터 + "ADK 결과 저장" 컴포넌트가 해야 할 일을 한 프로세스로 시뮬레이션한다:

  [6-카테고리 음성감정 + STT 표준어 텍스트]
        -> ADK 에이전트(analyze_mental_health) 5지표 점수
        -> 백엔드 내부 API(createJob -> saveResult -> status)로 기록
        -> PostgreSQL 적재 확인

핵심 포인트
- 음성감정은 emotion_model 의 실제 출력 스키마(6개: 기쁨/놀라움/두려움/사랑스러움/슬픔/화남)로 전달한다.
  에이전트는 emotion 을 프롬프트 컨텍스트로만 소비하므로 6개여도 코드 변경 없이 동작한다.
- 에이전트 키 emotional_fluctuation 은 백엔드 metric 키 emotion_variance 로 매핑해야 한다(안 하면 400).

실행: ai_agent 디렉터리에서 ..\\venv\\Scripts\\python.exe ..\\pipeline_record_test.py
"""
import json
import sys
import time
import requests

sys.path.insert(0, "ai_agent")
from agent.agent import analyze_mental_health  # noqa: E402

BASE = "http://localhost:8080"

# 1) 대상 어르신 선택 (대시보드 /api/main 에서 첫 번째)
elders = requests.get(f"{BASE}/api/main", timeout=5).json()["data"]
elder = elders[0]
elder_id = str(elder["elder_id"])
print(f"[1] 대상 어르신: id={elder_id} ({elder['gender']}, {elder['age']}세, status={elder['status']})")

# 2) 한 발화 단위 식별자
ts = int(time.time())
correlation_id = f"pipeline-test-{ts}"
session_id = f"pipeline-session-{ts}"

# 3) 분석 job 생성 (미들웨어가 발화 종료 시 호출하는 것)
job = requests.post(
    f"{BASE}/api/internal/analysis-jobs",
    json={
        "session_id": session_id,
        "elder_id": elder_id,
        "correlation_id": correlation_id,
        "requested_workers": ["emotion", "stt"],
    },
    timeout=5,
)
job.raise_for_status()
job_id = job.json()["job_id"]
print(f"[2] analysis_job 생성: job_id={job_id} status={job.json()['status']}")

# 4) STT(표준어) + 6-카테고리 음성감정 (emotion_model.infer.EmotionRecognizer.predict 출력 형태)
stt_text = "요즘 무릎이 아파서 병원을 자주 가요. 자식들은 다 멀리 살아서 며칠째 말할 사람도 없네요."
emotion_6 = {  # 실제 모델 라벨 6개 (sum=1.0)
    "기쁨": 0.03,
    "놀라움": 0.05,
    "두려움": 0.22,
    "사랑스러움": 0.02,
    "슬픔": 0.55,
    "화남": 0.13,
}
conversation = [
    {"role": "assistant", "text": "어르신, 오늘은 어떻게 지내셨어요?", "timestamp": ts - 60},
    {"role": "user", "text": stt_text, "timestamp": ts - 30},
]
print(f"[3] 입력 감정 카테고리 수: {len(emotion_6)}개 -> {list(emotion_6.keys())}")

# 5) ADK 에이전트 분석 (6개 감정을 그대로 전달)
result = analyze_mental_health(
    session_id=session_id,
    text=stt_text,
    emotion=json.dumps(emotion_6, ensure_ascii=False),
    conversation_history=json.dumps(conversation, ensure_ascii=False),
)
scores = result["scores"]
print(f"[4] ADK 5지표 점수: {json.dumps(scores, ensure_ascii=False)}")

# 6) 에이전트 키 -> 백엔드 metric 키 매핑 (emotional_fluctuation -> emotion_variance)
metrics = {
    "social_isolation": scores["social_isolation"],
    "health_anxiety": scores["health_anxiety"],
    "daily_vitality": scores["daily_vitality"],
    "emotion_variance": scores["emotional_fluctuation"],  # ★ 키 변환
    "cognitive_load": scores["cognitive_load"],
}
overall = round(sum(metrics.values()) / len(metrics), 2)

# 7) 결과 기록 (analysis_result + analysis_metric 저장)
save = requests.post(
    f"{BASE}/api/internal/analysis-jobs/{job_id}/result",
    json={
        "session_id": session_id,
        "elder_id": elder_id,
        "correlation_id": correlation_id,
        "job_status": "completed",
        "analysis_status": "SUCCESS",
        "adk_status": "SUCCESS",
        "stt_text": stt_text,
        "metrics": metrics,
        "summary_text": "무릎 통증으로 인한 건강 걱정과 사회적 고립 신호가 함께 관찰됨.",
        "overall_score": overall,
    },
    timeout=10,
)
save.raise_for_status()
print(f"[5] 결과 기록 완료: {json.dumps(save.json(), ensure_ascii=False)}")

# 8) job 최종 상태 업데이트
st = requests.patch(
    f"{BASE}/api/internal/analysis-jobs/{job_id}/status",
    json={"status": "completed", "correlation_id": correlation_id, "message": "pipeline test completed"},
    timeout=5,
)
st.raise_for_status()
print(f"[6] job 상태 업데이트: {json.dumps(st.json(), ensure_ascii=False)}")
print(f"\nDONE | job_id={job_id} correlation_id={correlation_id} overall_score={overall}")
