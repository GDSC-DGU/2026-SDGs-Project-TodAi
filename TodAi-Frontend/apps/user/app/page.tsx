"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BottomNav from "./_BottomNav";
import Mascot from "./_Mascot";

const USER_NAME = "박하준";
const CALL_NAME = "하준"; // 호칭
const WORKER_PHONE = "tel:01000000000";

const MOODS = [
  { key: "good", emoji: "😄", label: "좋아요" },
  { key: "ok", emoji: "🙂", label: "보통이에요" },
  { key: "tired", emoji: "😔", label: "피곤해요" },
  { key: "hard", emoji: "😢", label: "힘들어요" },
];

interface Dose {
  key: string;
  label: string;
  time: string;
  done: boolean;
}

export default function HomePage() {
  const [dateLabel, setDateLabel] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [doses, setDoses] = useState<Dose[]>([
    { key: "morning", label: "아침", time: "오전 8:00", done: true },
    { key: "noon", label: "점심", time: "오후 1:00", done: true },
    { key: "evening", label: "저녁", time: "오후 6:00", done: false },
  ]);

  useEffect(() => {
    const d = new Date();
    setDateLabel(
      `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, "0")}월 ${String(
        d.getDate(),
      ).padStart(2, "0")}일`,
    );
  }, []);

  const next = doses.find((d) => !d.done) ?? null;
  // 펼치면 전체, 접으면 다음 복용 예정 1개만 보인다.
  const visible = expanded ? doses : next ? [next] : doses.slice(-1);

  function completeNext() {
    if (!next) return;
    setDoses((prev) => prev.map((d) => (d.key === next.key ? { ...d, done: true } : d)));
  }

  return (
    <main className="flex flex-col h-[100dvh] w-full bg-[var(--background)]">
      {/* 헤더 */}
      <header className="shrink-0 px-5 pt-safe pb-3">
        <div className="flex items-start justify-between pt-2">
          <div>
            <p className="text-[0.95rem] text-[var(--muted)]">{dateLabel || " "}</p>
            <h1 className="text-[1.7rem] font-extrabold mt-0.5 tracking-tight">{USER_NAME}님</h1>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[0.95rem] font-semibold text-[var(--primary-dark)] bg-[var(--primary-soft)] px-3.5 py-2 rounded-full mt-1">
            <SunIcon />
            맑음
          </span>
        </div>
      </header>

      {/* 스크롤 영역 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-5 space-y-4">
        {/* 기분 */}
        <section className="t-card p-5">
          <h2 className="text-[1.2rem] font-bold">{CALL_NAME}님 오늘 기분 어떠세요?</h2>
          <div className="mt-4 grid grid-cols-4 gap-1.5">
            {MOODS.map((m) => {
              const on = mood === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setMood(m.key)}
                  className="flex flex-col items-center gap-1.5 py-1 active:scale-95 transition-transform"
                >
                  <span
                    className="w-14 h-14 rounded-full flex items-center justify-center text-[1.9rem] transition-all"
                    style={{
                      background: on ? "var(--primary-soft)" : "var(--surface-sunken)",
                      boxShadow: on ? "0 0 0 2.5px var(--primary)" : "none",
                    }}
                  >
                    {m.emoji}
                  </span>
                  <span
                    className="text-[0.75rem] leading-tight text-center"
                    style={{
                      color: on ? "var(--primary-dark)" : "var(--muted)",
                      fontWeight: on ? 700 : 500,
                    }}
                  >
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 약 복용 */}
        <section className="t-card p-5">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between"
            aria-expanded={expanded}
          >
            <span className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-[var(--success-soft)] flex items-center justify-center">
                <PillIcon />
              </span>
              <span className="text-[1.2rem] font-bold">오늘 약 복용</span>
            </span>
            <ChevronIcon up={expanded} />
          </button>

          <div className="mt-4 space-y-3.5">
            {visible.map((d) => (
              <div key={d.key} className="flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: d.done ? "#b3ada3" : "var(--success)" }}
                  />
                  <span>
                    <span className="block text-[1.05rem] font-bold leading-tight">{d.label}</span>
                    <span className="block text-[0.9rem] text-[var(--muted)] mt-0.5">{d.time}</span>
                  </span>
                </span>
                {d.done ? (
                  <span className="text-[0.9rem] font-bold text-white bg-[var(--success)] px-3.5 py-1.5 rounded-full">
                    완료
                  </span>
                ) : (
                  <span className="text-[0.9rem] font-bold text-[#1f8c50] bg-[var(--success-soft)] px-3.5 py-1.5 rounded-full">
                    예정
                  </span>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={completeNext}
            disabled={!next}
            className="mt-4 w-full text-white text-[1.1rem] font-bold rounded-2xl py-3.5 active:scale-[0.98] transition-transform disabled:opacity-50"
            style={{ background: "linear-gradient(180deg,#37b06a,#2f9e5e)" }}
          >
            {next ? `${next.label} 약 복용 완료` : "오늘 약 복용 모두 완료"}
          </button>
        </section>

        {/* 말벗 · 사회복지사 */}
        <section className="grid grid-cols-2 gap-3">
          <ContactTile
            icon={<Mascot size={30} />}
            title="토닥이"
            sub="토닥이와 대화하기"
            action="대화하기"
            href="/chat"
          />
          <ContactTile
            icon={<PersonIcon />}
            title="사회복지사"
            sub="김복지 선생님"
            action="전화하기"
            href={WORKER_PHONE}
          />
        </section>

        {/* SOS */}
        <section className="t-card p-5">
          <div className="flex items-center gap-3">
            <SosBadge />
            <span className="text-[1.2rem] font-bold">긴급 알람 SOS</span>
          </div>
          <p className="text-[0.95rem] font-medium text-[var(--danger)] mt-3">
            호출 시 경찰서 · 보호자에게 즉시 알림 전송
          </p>
          <button
            className="mt-4 w-full text-white text-[1.1rem] font-bold rounded-2xl py-3.5 active:scale-[0.98] transition-transform"
            style={{ background: "linear-gradient(180deg,#ea5b41,#d8432b)" }}
          >
            5초간 누르고 호출하기
          </button>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}

function ContactTile({
  icon,
  title,
  sub,
  action,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  action: string;
  href: string;
}) {
  return (
    <div className="t-card p-4 flex flex-col">
      <div className="flex items-center gap-2.5">
        <span className="w-10 h-10 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary-dark)]">
          {icon}
        </span>
        <span className="text-[1.1rem] font-bold leading-tight">{title}</span>
      </div>
      <p className="text-[0.9rem] text-[var(--muted)] mt-2">{sub}</p>
      <Link
        href={href}
        className="mt-3 self-start inline-flex items-center text-white text-[0.95rem] font-bold rounded-xl px-5 py-2.5 active:scale-95 transition-transform"
        style={{ background: "linear-gradient(180deg,var(--primary),var(--primary-dark))" }}
      >
        {action}
      </Link>
    </div>
  );
}

/* ── 아이콘 ── */
function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PillIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.2"
        y="8.5"
        width="17.6"
        height="7"
        rx="3.5"
        transform="rotate(-45 12 12)"
        stroke="#2f9e5e"
        strokeWidth="1.9"
      />
      <path d="M12 7.8 16.2 12" stroke="#2f9e5e" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="text-[var(--muted)] transition-transform duration-300"
      style={{ transform: up ? "rotate(180deg)" : "rotate(0deg)" }}
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SosBadge() {
  return (
    <span className="relative w-11 h-11 flex items-center justify-center">
      <span className="absolute inset-0 rounded-full bg-[var(--danger-soft)]" />
      <span className="relative w-9 h-9 rounded-full border-2 border-[var(--danger)] flex items-center justify-center text-[0.62rem] font-extrabold text-[var(--danger)] tracking-tight">
        SOS
      </span>
    </span>
  );
}
