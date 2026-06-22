"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Mascot from "../_Mascot";

interface Message {
  id: number;
  role: "user" | "todak";
  text: string;
}

// 토닥이의 Mock 응답. 실제 채팅 API가 준비되면 sendToTodak()만 교체하면 된다.
const TODAK_REPLIES = [
  "그러셨군요. 더 자세히 이야기해 주실 수 있을까요?",
  "오늘 그런 일이 있으셨군요. 마음이 어떠셨어요?",
  "이야기해 주셔서 고마워요. 듣고 있을게요.",
  "그럴 땐 정말 힘드셨겠어요. 토닥토닥 해드릴게요.",
  "오늘도 이렇게 이야기 나눠 주셔서 기뻐요. 식사는 잘 챙기셨어요?",
];

// TODO: 실제 백엔드 채팅 엔드포인트로 교체 (예: POST /proxy/api/chat)
async function sendToTodak(_history: Message[], turn: number): Promise<string> {
  await new Promise((r) => setTimeout(r, 900));
  return TODAK_REPLIES[turn % TODAK_REPLIES.length];
}

const GREETING: Message = {
  id: 0,
  role: "todak",
  text: "안녕하세요! 저는 말동무 토닥이예요. 오늘 하루는 어떻게 보내셨어요?",
};

// 자주 쓰는 말 — 한 번에 답하기 어려운 어르신을 위한 빠른 답변 칩
const QUICK_REPLIES = ["잘 지냈어요", "조금 외로웠어요", "몸이 안 좋아요", "심심해요"];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [turn, setTurn] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  // 입력 높이 자동 조절
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
  }, [input]);

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || thinking) return;

    const userMsg: Message = { id: Date.now(), role: "user", text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setThinking(true);

    try {
      const reply = await sendToTodak(history, turn);
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "todak", text: reply }]);
      setTurn((t) => t + 1);
    } finally {
      setThinking(false);
    }
  }

  const showQuick = messages.length === 1 && !thinking;

  return (
    <div className="flex-1 flex flex-col h-[100dvh] w-full bg-[var(--background)]">
      {/* 헤더 */}
      <header className="flex items-center gap-3 px-4 pt-safe pb-3 bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-10">
        <Link
          href="/"
          aria-label="홈으로"
          className="w-11 h-11 flex items-center justify-center rounded-full text-[var(--muted-strong)] text-3xl active:bg-[var(--surface-sunken)] transition-colors"
        >
          ‹
        </Link>
        <span className="w-11 h-11 rounded-full bg-[var(--primary-soft)] flex items-center justify-center overflow-visible">
          <Mascot size={34} />
        </span>
        <div className="flex-1">
          <p className="text-xl font-bold leading-tight">토닥이</p>
          <p className="text-sm text-[var(--success)] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
            언제나 곁에 있어요
          </p>
        </div>
        <Link
          href="/voice"
          aria-label="음성통화"
          className="shrink-0 w-11 h-11 rounded-full bg-[var(--primary-soft)] text-[var(--primary-dark)] flex items-center justify-center active:scale-95 transition-transform"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.3 1l-2.1 2.2Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </header>

      {/* 대화 */}
      <main className="flex-1 overflow-y-auto px-4 py-5">
        <p className="text-center text-sm text-[var(--muted)] mb-5">
          <span className="bg-[var(--surface-sunken)] rounded-full px-3 py-1">오늘</span>
        </p>

        <div className="space-y-3.5">
          {messages.map((m) =>
            m.role === "todak" ? (
              <div key={m.id} className="flex items-end gap-2 t-pop">
                <span className="shrink-0 w-9 h-9 rounded-full bg-[var(--primary-soft)] flex items-center justify-center overflow-visible mb-1">
                  <Mascot size={28} />
                </span>
                <p className="max-w-[78%] text-[1.2rem] leading-relaxed px-5 py-3.5 rounded-[1.4rem] rounded-bl-md bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-sm)]">
                  {m.text}
                </p>
              </div>
            ) : (
              <div key={m.id} className="flex justify-end t-pop">
                <p className="max-w-[80%] text-[1.2rem] leading-relaxed px-5 py-3.5 rounded-[1.4rem] rounded-br-md bg-gradient-to-b from-[var(--primary)] to-[var(--primary-dark)] text-white shadow-[var(--shadow-primary)]">
                  {m.text}
                </p>
              </div>
            ),
          )}

          {thinking && (
            <div className="flex items-end gap-2 t-pop">
              <span className="shrink-0 w-9 h-9 rounded-full bg-[var(--primary-soft)] flex items-center justify-center overflow-visible mb-1">
                <Mascot size={28} mood="idle" />
              </span>
              <div className="bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-sm)] rounded-[1.4rem] rounded-bl-md px-5 py-4 flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="todak-dot block w-2.5 h-2.5 rounded-full bg-[var(--muted)]"
                    style={{ animation: `todak-dot 1.2s ease-in-out ${i * 0.18}s infinite` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </main>

      {/* 빠른 답변 칩 */}
      {showQuick && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="text-[1.05rem] font-medium px-4 py-2.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted-strong)] active:bg-[var(--primary-soft)] active:border-[var(--primary)] transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* 입력 */}
      <footer className="px-4 pt-3 pb-safe bg-[var(--surface)] border-t border-[var(--border)]">
        <div className="flex items-end gap-2">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="이야기를 입력하세요"
            aria-label="이야기 입력"
            className="flex-1 resize-none text-[1.2rem] px-5 py-3.5 rounded-[1.4rem] bg-[var(--surface-sunken)] border border-transparent focus:outline-none focus:border-[var(--primary)] focus:bg-white transition-colors max-h-32"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || thinking}
            aria-label="보내기"
            className="shrink-0 w-14 h-14 rounded-full bg-gradient-to-b from-[var(--primary)] to-[var(--primary-dark)] shadow-[var(--shadow-primary)] disabled:opacity-40 disabled:shadow-none text-white flex items-center justify-center active:scale-95 transition-transform"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 11.5 19.5 4.5 12.5 20l-2.4-6.2L4 11.5Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
}
