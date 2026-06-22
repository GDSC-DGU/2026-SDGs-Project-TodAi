"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BottomNav from "../_BottomNav";

// 통화 연결 화면(보이스챗). 음소거 / 말하기 상태에 따라 컨트롤이 바뀐다.
// - 기본: 음소거 + 말하기
// - 말하기 활성화: 말하기 버튼이 주황으로 채워짐
// - 음소거 ON: 말하기 버튼이 사라지고 음소거만 가운데 표시
export default function VoicePage() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [talking, setTalking] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      if (next) setTalking(false); // 음소거하면 말하기 해제 + 버튼 숨김
      return next;
    });
  }

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;

  return (
    <main className="flex flex-col h-[100dvh] w-full bg-[var(--background)]">
      {/* 헤더 */}
      <header className="shrink-0 flex items-center gap-2 px-4 pt-safe pb-2">
        <button
          onClick={() => router.replace("/")}
          aria-label="뒤로"
          className="w-10 h-10 flex items-center justify-center rounded-full text-2xl text-[var(--muted-strong)] active:bg-[var(--surface-sunken)]"
        >
          ‹
        </button>
        <div className="flex-1">
          <p className="text-[1.15rem] font-bold leading-tight">토닥이</p>
          <p className="text-[0.85rem] text-[var(--success)] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
            온라인
          </p>
        </div>
        <Link
          href="/chat"
          aria-label="채팅으로"
          className="w-10 h-10 rounded-full bg-[var(--primary-soft)] text-[var(--primary-dark)] flex items-center justify-center active:scale-95 transition-transform"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H6a2 2 0 0 1-2-2V6Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </header>

      {/* 본문 */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6">
        {/* 그라데이션 오브 */}
        <div
          className="rounded-full"
          style={{
            width: 230,
            height: 230,
            background:
              "radial-gradient(circle at 32% 28%, #ffe2cf 0%, #ff9f78 34%, #f2738f 68%, #d8568f 100%)",
            boxShadow: "0 20px 50px -16px rgba(216,86,143,0.5)",
            animation: "orb-breathe 4s ease-in-out infinite",
          }}
        />

        <h1 className="text-[1.7rem] font-extrabold mt-7 tracking-tight">토닥이</h1>
        <p className="text-[0.95rem] font-semibold text-[var(--primary-dark)] mt-2">
          통화 시간 {mmss}
        </p>

        {/* 음성 파형 */}
        <div className="flex items-center justify-center gap-[3px] h-14 mt-5 w-full max-w-[300px]">
          {Array.from({ length: 30 }).map((_, i) => {
            // SSR/CSR 일치를 위해 짧고 결정적인 값으로 반올림 (긴 부동소수점 방지)
            const base = 8 + Math.round(20 * Math.abs(Math.sin(i * 0.9 + 0.5)));
            const op = Math.round((0.55 + 0.45 * Math.abs(Math.sin(i * 0.9))) * 100) / 100;
            const delay = (i * 5) / 100; // = i*0.05, 깔끔한 소수
            return (
              <span
                key={i}
                className="rounded-full"
                style={{
                  width: 3.5,
                  height: base,
                  background: "var(--primary)",
                  opacity: op,
                  transformOrigin: "center",
                  animation: `wave ${talking ? "0.7" : "1.1"}s ease-in-out ${delay}s infinite`,
                }}
              />
            );
          })}
        </div>

        {/* 컨트롤 */}
        <div className="flex items-start justify-center gap-12 mt-8 min-h-[92px]">
          <ControlButton label="음소거" active={muted} onClick={toggleMute}>
            <MicOffIcon />
          </ControlButton>
          {!muted && (
            <ControlButton label="말하기" active={talking} onClick={() => setTalking((t) => !t)}>
              <MicIcon />
            </ControlButton>
          )}
        </div>
      </div>

      {/* 대화 종료 */}
      <div className="shrink-0 px-5 pb-3">
        <button
          onClick={() => router.replace("/")}
          className="t-btn text-white"
          style={{ background: "linear-gradient(180deg,#ea5b41,#d8432b)" }}
        >
          대화 종료
        </button>
      </div>

      <BottomNav />
    </main>
  );
}

function ControlButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        aria-pressed={active}
        aria-label={label}
        className="w-16 h-16 rounded-full flex items-center justify-center active:scale-95 transition-all"
        style={{
          background: active ? "var(--primary)" : "var(--surface)",
          color: active ? "#fff" : "var(--muted-strong)",
          border: active ? "none" : "1.5px solid var(--border)",
          boxShadow: active ? "var(--shadow-primary)" : "var(--shadow-sm)",
        }}
      >
        {children}
      </button>
      <span className="text-[0.9rem] text-[var(--muted-strong)] font-medium">{label}</span>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 9V6a3 3 0 0 1 6 0v5m-1.2 2.8A3 3 0 0 1 9 11"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 11a6.5 6.5 0 0 0 10 5M12 17.5V21"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path d="m4 4 16 16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}
