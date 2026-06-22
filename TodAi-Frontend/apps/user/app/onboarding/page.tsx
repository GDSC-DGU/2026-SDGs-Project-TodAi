"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AUTHED_KEY, ONBOARDED_KEY } from "../_FirstRunGate";

interface Slide {
  key: string;
  img: string;
  title: string;
  desc: string;
  button: string;
}

const SLIDES: Slide[] = [
  {
    key: "ai",
    img: "/call.svg",
    title: "토닥이가 전화했어요!",
    desc: "언제든지 토닥이에게\n전화하듯 말을 걸어보세요.",
    button: "다음",
  },
  {
    key: "med",
    img: "/medicine.svg",
    title: "약 복용을 챙겨드려요.",
    desc: "약 이름, 시간, 용량을 등록하면\nAI가 시간에 맞춰 알려드려요.",
    button: "다음",
  },
  {
    key: "sos",
    img: "/sos.svg",
    title: "위급할 땐 바로 알려요.",
    desc: "긴급 알람 버튼으로 위급 상황 시\n보호자와 복지사에게 즉시 알림을 보내요.",
    button: "시작하기",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);

  const isLast = index === SLIDES.length - 1;

  function finish() {
    localStorage.setItem(ONBOARDED_KEY, "1");
    router.replace(localStorage.getItem(AUTHED_KEY) ? "/" : "/login");
  }

  function next() {
    if (isLast) finish();
    else setIndex((i) => i + 1);
  }

  function onTouchEnd(endX: number) {
    if (touchX === null) return;
    const dx = endX - touchX;
    if (dx < -50 && index < SLIDES.length - 1) setIndex((i) => i + 1);
    if (dx > 50 && index > 0) setIndex((i) => i - 1);
    setTouchX(null);
  }

  return (
    <div className="flex-1 flex flex-col h-[100dvh] w-full bg-[var(--background)]">
      {/* 건너뛰기 */}
      <div className="flex justify-end px-5 pt-safe">
        <button
          onClick={finish}
          className="text-lg font-medium text-[var(--muted)] px-4 py-2 rounded-full active:bg-[var(--surface-sunken)] transition-colors"
        >
          건너뛰기
        </button>
      </div>

      {/* 슬라이드 (스와이프 가능) */}
      <div
        className="flex-1 overflow-hidden"
        onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
        onTouchEnd={(e) => onTouchEnd(e.changedTouches[0].clientX)}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {SLIDES.map((s) => (
            <section
              key={s.key}
              className="w-full shrink-0 h-full flex flex-col items-center text-center px-8"
            >
              {/* 3D 아이콘 — 상단 영역 중앙 */}
              <div className="flex-1 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.img}
                  alt=""
                  aria-hidden
                  className="w-60 h-60 object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.12)]"
                />
              </div>

              {/* 제목 · 설명 — 화면 중앙 아래 */}
              <div className="flex-1 flex flex-col items-center">
                <h1 className="text-[1.6rem] font-extrabold tracking-tight text-[var(--primary-dark)]">
                  {s.title}
                </h1>
                <p className="text-[1.2rem] text-[var(--muted-strong)] mt-4 leading-relaxed whitespace-pre-line">
                  {s.desc}
                </p>
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* 페이지 점 */}
      <div className="flex items-center justify-center gap-2 mb-7">
        {SLIDES.map((s, i) => (
          <span
            key={s.key}
            className="h-2.5 rounded-full transition-all duration-300"
            style={{
              width: i === index ? 28 : 10,
              backgroundColor: i === index ? "var(--primary)" : "#d8cfc0",
            }}
          />
        ))}
      </div>

      {/* 버튼 */}
      <div className="px-6 pb-safe">
        <button onClick={next} className="t-btn t-btn-primary">
          {SLIDES[index].button}
        </button>
      </div>
    </div>
  );
}
