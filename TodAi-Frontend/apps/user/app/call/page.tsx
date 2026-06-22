"use client";

import { useRouter } from "next/navigation";
import Mascot from "../_Mascot";

// 토닥이에게서 전화가 오는 수신 화면 (예약 통화 알림).
// 거절 → 홈으로, 수락 → 대화(채팅) 화면으로.
export default function CallPage() {
  const router = useRouter();

  return (
    <main
      className="flex flex-col h-[100dvh] w-full text-white"
      style={{ background: "linear-gradient(180deg,#3b3733 0%,#2a2723 100%)" }}
    >
      {/* 발신자 */}
      <div className="pt-safe px-6 text-center">
        <div className="pt-16">
          <h1 className="text-[2rem] font-extrabold tracking-tight">토닥이</h1>
          <p className="text-[1.1rem] text-white/70 mt-2.5">예약된 오후 3:00 통화예요.</p>
        </div>
      </div>

      {/* 마스코트 (수신 중 펄스) */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          <span
            aria-hidden
            className="absolute inset-0 -m-4 rounded-full bg-[var(--primary)] opacity-25 animate-ping"
          />
          <span
            aria-hidden
            className="t-halo absolute inset-0 -m-2 rounded-full bg-white/10"
          />
          <div className="relative w-36 h-36 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center overflow-visible">
            <Mascot size={104} float />
          </div>
        </div>
      </div>

      {/* 거절 / 수락 */}
      <div className="px-12 pt-6 pb-safe">
        <div className="flex items-start justify-between pb-8">
          <CallButton
            label="거절"
            color="#ff3b30"
            onClick={() => router.replace("/")}
            decline
          />
          <CallButton
            label="수락"
            color="#34c759"
            onClick={() => router.replace("/voice")}
            pulse
          />
        </div>
      </div>
    </main>
  );
}

function CallButton({
  label,
  color,
  onClick,
  decline = false,
  pulse = false,
}: {
  label: string;
  color: string;
  onClick: () => void;
  decline?: boolean;
  pulse?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={onClick}
        aria-label={label}
        className="relative w-[76px] h-[76px] rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        style={{ background: color }}
      >
        {pulse && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: color, opacity: 0.35 }}
          />
        )}
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
          className="relative text-white"
          style={{ transform: decline ? "rotate(135deg)" : "none" }}
        >
          <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.3 1l-2.1 2.2Z" />
        </svg>
      </button>
      <span className="text-[1.05rem] text-white/90">{label}</span>
    </div>
  );
}
