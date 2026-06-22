import json
from agent.agent import analyze_mental_health

data = {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "agent_type": "social_isolation",
    "emotion": {
        "sadness": 0.61,
        "anxiety": 0.22,
        "neutral": 0.13,
        "joy": 0.04
    },
    "text": "오늘 아무도 안 왔어요. 아들한테 전화했는데 바쁘다고 끊더라고요. 밥도 혼자 먹었어요.",
    "conversation_history": [
        {"role": "assistant", "text": "어르신, 오늘 하루 어떻게 보내셨어요?", "timestamp": 1748995200},
        {"role": "user", "text": "오늘 아무도 안 왔어요. 아들한테 전화했는데 바쁘다고 끊더라고요. 밥도 혼자 먹었어요.", "timestamp": 1748995230},
        {"role": "assistant", "text": "많이 외로우셨겠어요. 아드님이 바빠서 속상하셨겠네요.", "timestamp": 1748995262},
        {"role": "user", "text": "요즘 맨날 그래요. 예전엔 주말마다 왔는데.", "timestamp": 1748995290}
    ]
}

result = analyze_mental_health(
    session_id=data["session_id"],
    text=data["text"],
    emotion=json.dumps(data["emotion"]),
    conversation_history=json.dumps(data["conversation_history"]),
)

print(json.dumps(result, ensure_ascii=False, indent=2))