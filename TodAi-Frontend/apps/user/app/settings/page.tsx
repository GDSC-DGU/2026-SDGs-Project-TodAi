"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BottomNav from "../_BottomNav";
import TimePicker from "../_TimePicker";
import { AUTHED_KEY, ONBOARDED_KEY } from "../_FirstRunGate";

interface TimeVal {
  h: number;
  m: number;
}
type TimeKey = "call" | "morning" | "noon" | "evening";
const fmtTime = (t: TimeVal) =>
  `${String(t.h).padStart(2, "0")}:${String(t.m).padStart(2, "0")}`;

// 글씨 크기: 루트(html) 폰트 크기를 px 단위로 직접 조절한다. (기본 18px)
const FONT_KEY = "todak_font_px";
const FONT_MIN = 16;
const FONT_MAX = 22;
const FONT_DEFAULT = 18;

const USER_NAME = "박하준";
const USER_PHONE = "010-1234-5678";
const USER_AGE = "62세";

export default function SettingsPage() {
  const router = useRouter();
  const [medAlarm, setMedAlarm] = useState(true);
  const [callAlarm, setCallAlarm] = useState(true);
  const [sosAlarm, setSosAlarm] = useState(false);
  const [fontPx, setFontPx] = useState(FONT_DEFAULT);

  // 복용·전화 시간 + 타임피커 편집 상태
  const [times, setTimes] = useState<Record<TimeKey, TimeVal>>({
    call: { h: 15, m: 0 },
    morning: { h: 8, m: 0 },
    noon: { h: 13, m: 0 },
    evening: { h: 18, m: 0 },
  });
  const [editing, setEditing] = useState<{ key: TimeKey; title: string; label?: string } | null>(
    null,
  );

  function saveTime(h: number, m: number) {
    if (!editing) return;
    setTimes((prev) => ({ ...prev, [editing.key]: { h, m } }));
    setEditing(null);
  }

  // 저장된 글씨 크기를 불러와 슬라이더 초기값에 반영
  useEffect(() => {
    const saved = Number(localStorage.getItem(FONT_KEY));
    if (saved >= FONT_MIN && saved <= FONT_MAX) setFontPx(saved);
  }, []);

  function changeFont(px: number) {
    setFontPx(px);
    document.documentElement.style.fontSize = `${px}px`;
    localStorage.setItem(FONT_KEY, String(px));
  }

  function logout() {
    localStorage.removeItem(AUTHED_KEY);
    localStorage.removeItem(ONBOARDED_KEY);
    localStorage.removeItem("todak_phone");
    router.replace("/onboarding");
  }

  return (
    <main className="flex flex-col h-[100dvh] w-full bg-[var(--background)]">
      <header className="shrink-0 px-5 pt-safe pb-2">
        <h1 className="text-[1.9rem] font-extrabold tracking-tight pt-2">설정</h1>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 space-y-6">
        {/* 프로필 */}
        <section className="t-card p-4 flex items-center gap-3.5">
          <span className="w-12 h-12 rounded-full bg-[var(--primary-soft)] text-[var(--primary-dark)] flex items-center justify-center text-[1.25rem] font-extrabold">
            {USER_NAME[0]}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[1.15rem] font-bold leading-tight">{USER_NAME} 님</p>
            <p className="text-[0.9rem] text-[var(--muted)] mt-0.5">
              {USER_PHONE} · {USER_AGE}
            </p>
          </div>
          <button className="text-[0.95rem] font-bold text-[var(--primary-dark)] active:opacity-70">
            수정 →
          </button>
        </section>

        {/* 알림 설정 */}
        <Section label="알림 설정">
          <ToggleCard
            title="약 복용 알림"
            sub="설정 시간에 알림"
            on={medAlarm}
            onChange={setMedAlarm}
          />
          <ToggleCard
            title="토닥이 전화 걸기"
            sub="하루 1회 예약된 시간에 전화걸기"
            on={callAlarm}
            onChange={setCallAlarm}
          />
          <ToggleCard
            title="긴급 상황 알림"
            sub="이상 감지 즉시 연락"
            on={sosAlarm}
            onChange={setSosAlarm}
          />
        </Section>

        {/* 전화 시간 설정 */}
        <Section label="전화 시간 설정">
          <div className="t-card px-4 py-3.5">
            <TimeRow
              label="토닥이 전화 걸기"
              time={fmtTime(times.call)}
              onEdit={() => setEditing({ key: "call", title: "전화 시간 설정" })}
            />
          </div>
        </Section>

        {/* 약 복용 시간 설정 */}
        <Section label="약 복용 시간 설정">
          <div className="t-card px-4 py-1.5 divide-y divide-[var(--border)]">
            <TimeRow
              label="아침"
              time={fmtTime(times.morning)}
              onEdit={() => setEditing({ key: "morning", title: "복용 시간 설정", label: "아침" })}
            />
            <TimeRow
              label="점심"
              time={fmtTime(times.noon)}
              onEdit={() => setEditing({ key: "noon", title: "복용 시간 설정", label: "점심" })}
            />
            <TimeRow
              label="저녁"
              time={fmtTime(times.evening)}
              onEdit={() => setEditing({ key: "evening", title: "복용 시간 설정", label: "저녁" })}
            />
          </div>
        </Section>

        {/* 접근성 */}
        <Section label="접근성">
          <div className="t-card p-4">
            <p className="text-[1.1rem] font-bold">글씨 크기 조절</p>
            <div className="flex items-center gap-3 mt-3.5">
              <span className="text-base text-[var(--muted)] shrink-0">가</span>
              <input
                type="range"
                min={FONT_MIN}
                max={FONT_MAX}
                step={1}
                value={fontPx}
                onChange={(e) => changeFont(Number(e.target.value))}
                aria-label="글씨 크기"
                className="flex-1 h-2 accent-[var(--primary)]"
              />
              <span className="text-[1.6rem] font-extrabold shrink-0 leading-none">가</span>
            </div>
          </div>
        </Section>

        {/* 연결된 복지사·보호자 */}
        <Section label="연결된 복지사·보호자">
          <div className="t-card p-4 flex items-center gap-3.5">
            <span className="w-11 h-11 rounded-full bg-[var(--primary-soft)] text-[var(--primary-dark)] flex items-center justify-center text-[1.1rem] font-extrabold">
              김
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[1.1rem] font-bold leading-tight">김복지 선생님</p>
              <p className="text-[0.9rem] text-[var(--muted)] mt-0.5">사회복지사 연결됨</p>
            </div>
            <button className="text-[0.95rem] font-bold text-[var(--danger)] active:opacity-70">
              연결 해제 →
            </button>
          </div>
        </Section>

        {/* 계정관리 */}
        <Section label="계정관리">
          <button
            onClick={logout}
            className="t-card w-full text-left px-5 py-4 text-[1.1rem] font-bold active:bg-[var(--surface-sunken)] transition-colors"
          >
            로그아웃
          </button>
          <button className="t-card w-full text-left px-5 py-4 text-[1.1rem] font-bold text-[var(--danger)] active:bg-[var(--danger-soft)] transition-colors">
            계정 탈퇴
          </button>
        </Section>
      </div>

      <BottomNav />

      {editing && (
        <TimePicker
          key={editing.key}
          title={editing.title}
          label={editing.label}
          initH={times[editing.key].h}
          initM={times[editing.key].m}
          onCancel={() => setEditing(null)}
          onSave={saveTime}
        />
      )}
    </main>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-[0.95rem] font-semibold text-[var(--muted)] mb-2.5 px-1">{label}</p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ToggleCard({
  title,
  sub,
  on,
  onChange,
}: {
  title: string;
  sub: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="t-card p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[1.1rem] font-bold leading-tight">{title}</p>
        <p className="text-[0.9rem] text-[var(--muted)] mt-1">{sub}</p>
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="relative w-[54px] h-[32px] rounded-full shrink-0 transition-colors"
      style={{ background: on ? "var(--primary)" : "#d6cfc2" }}
    >
      <span
        className="absolute top-[3px] left-[3px] w-[26px] h-[26px] rounded-full bg-white shadow-md transition-transform duration-200"
        style={{ transform: on ? "translateX(22px)" : "translateX(0)" }}
      />
    </button>
  );
}

function TimeRow({ label, time, onEdit }: { label: string; time: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[1.1rem] font-bold">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className="text-[1.05rem] font-bold text-[var(--primary-dark)] bg-[var(--primary-soft)] px-3 py-1.5 rounded-lg tabular-nums">
          {time}
        </span>
        <button
          onClick={onEdit}
          className="text-[0.9rem] font-bold text-white bg-[var(--primary)] px-3 py-1.5 rounded-lg active:opacity-85"
        >
          변경
        </button>
      </span>
    </div>
  );
}
