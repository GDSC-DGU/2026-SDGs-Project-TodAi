"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// iOS 스타일 휠 타임피커 (바텀시트). 시·분을 굴려 맞추고 저장한다.
const ITEM_H = 44;
const VISIBLE = 5; // 화면에 보이는 행 수 (가운데가 선택)
const PAD = Math.floor(VISIBLE / 2); // 위·아래 여백 행 수
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,…,55

export default function TimePicker({
  title,
  label,
  initH,
  initM,
  onCancel,
  onSave,
}: {
  title: string;
  label?: string | null;
  initH: number;
  initM: number;
  onCancel: () => void;
  onSave: (h: number, m: number) => void;
}) {
  const [h, setH] = useState(initH);
  // 분은 5단위로 스냅
  const [m, setM] = useState(MINUTES.includes(initM) ? initM : Math.round(initM / 5) * 5);

  return (
    <div className="absolute inset-0 z-50">
      <button
        aria-label="닫기"
        onClick={onCancel}
        className="absolute inset-0 bg-black/35"
        style={{ animation: "todak-fade 0.25s ease both" }}
      />
      <div
        className="absolute inset-x-0 bottom-0 bg-[var(--surface)] rounded-t-[28px] px-5 pt-3 pb-safe shadow-2xl"
        style={{ animation: "sheet-up 0.32s cubic-bezier(0.22,1,0.36,1) both" }}
      >
        {/* 그래버 */}
        <span className="block mx-auto w-10 h-1.5 rounded-full bg-[#d8d2c7] mb-4" />

        <div className="flex items-center justify-between">
          <h2 className="text-[1.3rem] font-extrabold tracking-tight">{title}</h2>
          {label && (
            <span className="text-[0.95rem] font-semibold text-[var(--primary-dark)] bg-[var(--primary-soft)] px-3.5 py-1.5 rounded-full">
              {label}
            </span>
          )}
        </div>

        {/* 휠 */}
        <div className="relative mt-5" style={{ height: ITEM_H * VISIBLE }}>
          {/* 가운데 선택 밴드 */}
          <div
            className="absolute inset-x-2 top-1/2 -translate-y-1/2 rounded-2xl bg-[var(--primary-tint)] pointer-events-none"
            style={{ height: ITEM_H }}
          />
          <div className="relative flex items-stretch justify-center h-full">
            <Wheel values={HOURS} value={h} onChange={setH} />
            <div className="flex items-center justify-center w-7 text-[1.7rem] font-bold text-[var(--muted-strong)] pb-0.5">
              :
            </div>
            <Wheel values={MINUTES} value={m} onChange={setM} />
          </div>
        </div>

        {/* 버튼 */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={onCancel}
            className="t-btn"
            style={{
              border: "1.5px solid var(--border)",
              color: "var(--muted-strong)",
              background: "var(--surface)",
            }}
          >
            취소
          </button>
          <button onClick={() => onSave(h, m)} className="t-btn t-btn-primary">
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}

function Wheel({
  values,
  value,
  onChange,
}: {
  values: number[];
  value: number;
  onChange: (v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const selIdx = values.indexOf(value);

  // 처음 열릴 때 선택값이 가운데 오도록 스크롤 위치를 잡는다.
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = Math.max(0, values.indexOf(value)) * ITEM_H;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  function onScroll() {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.min(Math.max(Math.round(el.scrollTop / ITEM_H), 0), values.length - 1);
      if (values[i] !== value) onChange(values[i]);
    });
  }

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className="no-scrollbar overflow-y-auto snap-y snap-mandatory"
      style={{ width: 92, height: ITEM_H * VISIBLE }}
    >
      <div style={{ height: ITEM_H * PAD }} />
      {values.map((v, i) => {
        const dist = Math.abs(i - selIdx);
        return (
          <div
            key={v}
            className="snap-center flex items-center justify-center tabular-nums"
            style={{
              height: ITEM_H,
              fontSize: dist === 0 ? "1.75rem" : "1.3rem",
              fontWeight: dist === 0 ? 800 : 600,
              color:
                dist === 0
                  ? "var(--foreground)"
                  : dist === 1
                    ? "#b6ad9f"
                    : "#d8d0c2",
              transition: "color 0.12s ease, font-size 0.12s ease",
            }}
          >
            {String(v).padStart(2, "0")}
          </div>
        );
      })}
      <div style={{ height: ITEM_H * PAD }} />
    </div>
  );
}
