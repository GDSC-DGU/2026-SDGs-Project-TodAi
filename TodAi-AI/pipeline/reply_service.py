"""말벗 대답 HTTP 서비스 — 프론트(user 앱 chat 화면)가 호출한다.

POST /api/chat  { "message": "...", "history": [{"role","text"}, ...] }  -> { "reply": "..." }
GET  /health

로컬 LLM(Ollama)을 reply_llm.generate_reply 로 호출. dev 편의를 위해 CORS 전체 허용.
실행: python pipeline/reply_service.py   (기본 :8100)
"""
import os
import sys

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(__file__))
from reply_llm import REPLY_MODEL, generate_reply  # noqa: E402

PORT = int(os.getenv("REPLY_SERVICE_PORT", "8100"))

app = FastAPI(title="TodAi 말벗 대답 서비스")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


DEFAULT_ELDER_ID = os.getenv("DEMO_ELDER_ID")


class ChatRequest(BaseModel):
    message: str
    history: list = []
    elder_id: str | int | None = None


@app.get("/health")
def health():
    return {"status": "ok", "model": REPLY_MODEL}


@app.post("/api/chat")
def chat(req: ChatRequest):
    try:
        elder_id = req.elder_id if req.elder_id not in (None, "") else DEFAULT_ELDER_ID
        reply = generate_reply(req.history, req.message, elder_id=elder_id)
        return {"reply": reply}
    except Exception as exc:  # noqa: BLE001
        return {"reply": "지금은 잠시 말이 막혔어요. 조금 뒤에 다시 이야기 나눠요.", "error": str(exc)}


if __name__ == "__main__":
    print(f"reply_service up on :{PORT} | model={REPLY_MODEL}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
