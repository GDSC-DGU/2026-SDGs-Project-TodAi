"use client";

import { useEffect, useState } from "react";
import Mascot from "./_Mascot";

// 콜드 스타트 시 1회 재생되는 런치 스플래시.
// 점이 1→2→3개로 차오르는 타이핑 연출 후 마스코트+서비스명으로 전환되고 사라진다.
export default function Splash() {
  // phase 0: 타이핑 점 / phase 1: 마스코트·서비스명 / phase 2: 페이드아웃 후 제거
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const [dotCount, setDotCount] = useState(1); // 1 → 2 → 3 반복
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const grow = setInterval(() => {
      setDotCount((c) => (c >= 3 ? 1 : c + 1));
    }, 500);
    const toLogo = setTimeout(() => {
      clearInterval(grow);
      setPhase(1);
    }, 2200);
    const toFade = setTimeout(() => setPhase(2), 3400);
    const remove = setTimeout(() => setGone(true), 3900);
    return () => {
      clearInterval(grow);
      clearTimeout(toLogo);
      clearTimeout(toFade);
      clearTimeout(remove);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-[#f59a63] via-[#ef7c48] to-[#dd6531] transition-opacity duration-500"
      style={{ opacity: phase === 2 ? 0 : 1 }}
    >
      {/* 타이핑 점 말풍선 */}
      <div
        className="absolute transition-all duration-500"
        style={{
          opacity: phase === 0 ? 1 : 0,
          transform: phase === 0 ? "scale(1)" : "scale(0.5)",
        }}
      >
        <Bubble size="lg">
          <div className="flex items-center gap-3">
            {Array.from({ length: dotCount }).map((_, i) => (
              <span
                key={i}
                className="block w-4 h-4 rounded-full bg-white"
                style={{ animation: "todak-pop 0.4s ease-out both" }}
              />
            ))}
          </div>
        </Bubble>
      </div>

      {/* 마스코트 + 서비스명 */}
      <div
        className="flex flex-col items-center transition-all duration-500"
        style={{
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? "translateY(0) scale(1)" : "translateY(10px) scale(0.94)",
        }}
      >
        <div className="rounded-[2rem] bg-white/20 p-5 shadow-2xl backdrop-blur-sm">
          <Mascot size={92} />
        </div>
        <p className="text-[2.6rem] font-extrabold text-white leading-tight mt-5 tracking-tight">
          토닥
        </p>
        <p className="text-base text-white/85 mt-1.5">어르신과 마음을 잇는 AI 말벗</p>
      </div>
    </div>
  );
}

// 반투명 유리 말풍선 (왼쪽 아래 꼬리)
function Bubble({ size, children }: { size: "lg" | "sm"; children: React.ReactNode }) {
  const dims =
    size === "lg"
      ? "px-9 py-7 rounded-[2.5rem] rounded-bl-lg"
      : "px-3 py-2.5 rounded-2xl rounded-bl-md";
  return (
    <div
      className={`relative flex items-center justify-center shadow-lg ${dims}`}
      style={{
        background: "rgba(255,255,255,0.22)",
        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.5), 0 8px 24px rgba(150,60,20,0.35)",
        backdropFilter: "blur(3px)",
      }}
    >
      {children}
    </div>
  );
}
