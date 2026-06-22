"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AUTHED_KEY } from "../_FirstRunGate";
import Mascot from "../_Mascot";

// ── Mock 인증 (실제 백엔드 연동 시 교체) ──────────────────────────
// 복지사가 등록한 번호만 인증번호를 받을 수 있다. 데모용으로 아래 번호를 등록된 번호로 취급.
const REGISTERED_NUMBER = "010-1234-5678";
const MOCK_OTP = "143536"; // 발송됐다고 가정하는 6자리 (자동입력으로 채워짐)

function isRegistered(_phone: string) {
  // TODO: 실제로는 백엔드(복지사 등록 명단)에 조회.
  // 데모 단계에서는 어떤 번호를 입력해도 통과시킨다.
  return true;
}

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

function mmss(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Step = "phone" | "otp" | "error";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");

  function sendCode() {
    if (!isRegistered(phone)) {
      setStep("error");
      return;
    }
    setStep("otp");
  }

  function onVerified() {
    localStorage.setItem(AUTHED_KEY, "1");
    localStorage.setItem("todak_phone", phone);
    router.replace("/");
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-[var(--background)]">
      {step === "phone" && (
        <PhoneStep
          phone={phone}
          onChange={setPhone}
          onBack={() => router.back()}
          onSubmit={sendCode}
        />
      )}
      {step === "otp" && (
        <OtpStep phone={phone} onBack={() => setStep("phone")} onVerified={onVerified} />
      )}
      {step === "error" && (
        <ErrorStep
          onRetry={() => {
            setPhone("");
            setStep("phone");
          }}
        />
      )}
    </div>
  );
}

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <div className="px-4 pt-safe">
      <button
        onClick={onBack}
        aria-label="뒤로"
        className="w-11 h-11 flex items-center justify-center rounded-full text-3xl leading-none text-[var(--muted-strong)] active:bg-[var(--surface-sunken)] transition-colors"
      >
        ←
      </button>
    </div>
  );
}

function PhoneStep({
  phone,
  onChange,
  onBack,
  onSubmit,
}: {
  phone: string;
  onChange: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const valid = phone.replace(/\D/g, "").length === 11;
  return (
    <>
      <BackBar onBack={onBack} />
      <div className="flex-1 flex flex-col px-6 pb-safe pt-3">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-[var(--primary-soft)] items-center justify-center overflow-visible mb-5">
          <Mascot size={40} />
        </span>
        <h1 className="text-[1.4rem] font-bold leading-snug tracking-tight">
          본인인증을 위해
          <br />
          휴대폰 번호를 입력해주세요.
        </h1>
        <p className="text-[1rem] text-[var(--muted)] mt-2.5">
          복지사가 등록한 번호로 본인확인을 합니다.
        </p>

        <label className="block text-sm text-[var(--muted)] mt-8 mb-2 font-medium">전화번호</label>
        <input
          inputMode="numeric"
          value={phone}
          onChange={(e) => onChange(formatPhone(e.target.value))}
          placeholder="010-0000-0000"
          aria-label="전화번호"
          className="t-input text-[1.25rem] px-4 py-3.5 tracking-wide"
        />
        <p className="text-sm text-[var(--muted)] mt-2.5">담당 복지사에게 등록된 번호를 입력하세요.</p>

        <button disabled={!valid} onClick={onSubmit} className="t-btn t-btn-primary mt-auto">
          인증번호 발송
        </button>
      </div>
    </>
  );
}

function OtpStep({
  phone,
  onBack,
  onVerified,
}: {
  phone: string;
  onBack: () => void;
  onVerified: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [seconds, setSeconds] = useState(180);
  const [autoFilled, setAutoFilled] = useState(false);
  const [error, setError] = useState(false);
  // 가짜 문자 푸시 알림: "hidden"(없음) → "in"(내려옴) → "out"(올라가 사라짐)
  const [notif, setNotif] = useState<"hidden" | "in" | "out">("hidden");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // 카운트다운
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  // 발송 1.4초 뒤, 문자가 도착한 것처럼 상단에 알림 배너가 내려온다.
  useEffect(() => {
    const t = setTimeout(() => setNotif("in"), 1400);
    return () => clearTimeout(t);
  }, []);

  // 배너는 잠시 떠 있다가(6초) 스스로 위로 사라진다.
  useEffect(() => {
    if (notif !== "in") return;
    const t = setTimeout(() => setNotif("out"), 6000);
    return () => clearTimeout(t);
  }, [notif]);

  // 알림(또는 키보드 자동완성)을 탭하면 6자리가 한 번에 채워진다.
  function applyCode() {
    setDigits(MOCK_OTP.split(""));
    setAutoFilled(true);
    setError(false);
    setNotif("out");
    inputs.current[5]?.focus();
  }

  function setDigit(i: number, v: string) {
    const c = v.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = c;
      return next;
    });
    setError(false);
    if (c && i < 5) inputs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  function resend() {
    setDigits(Array(6).fill(""));
    setAutoFilled(false);
    setError(false);
    setSeconds(180);
    setNotif("hidden");
    inputs.current[0]?.focus();
    // 재발송하면 잠시 뒤 문자 알림이 다시 도착한다.
    setTimeout(() => setNotif("in"), 1400);
  }

  function verify() {
    if (digits.join("") === MOCK_OTP) onVerified();
    else setError(true);
  }

  const filled = digits.every((d) => d !== "");

  return (
    <>
      <OtpPush state={notif} code={MOCK_OTP} onTap={applyCode} />
      <BackBar onBack={onBack} />
      <div className="flex-1 flex flex-col px-6 pb-safe pt-3">
        <h1 className="text-[1.4rem] font-bold leading-snug tracking-tight">
          보내드린 인증번호
          <br />
          6자리를 입력해주세요.
        </h1>
        <p className="text-[1rem] text-[var(--muted)] mt-2.5">{phone}로 발송했어요.</p>

        {/* OTP 6칸 */}
        <div className="flex gap-2 mt-7">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              inputMode="numeric"
              maxLength={1}
              aria-label={`인증번호 ${i + 1}번째 자리`}
              className="flex-1 min-w-0 h-14 text-center text-[1.4rem] font-bold rounded-xl bg-white border-2 focus:outline-none transition-all"
              style={{
                borderColor: error ? "var(--danger)" : d ? "var(--primary)" : "var(--border)",
                color: error ? "var(--danger)" : "var(--foreground)",
                boxShadow: d && !error ? "0 0 0 4px var(--primary-tint)" : "none",
              }}
            />
          ))}
        </div>

        {/* 타이머 / 재발송 */}
        <div className="flex items-center justify-between mt-3.5">
          <span className="text-base font-bold text-[var(--danger)] tabular-nums">{mmss(seconds)}</span>
          <button
            onClick={resend}
            className="text-base font-medium text-[var(--primary-dark)] underline underline-offset-4"
          >
            인증번호 재발송
          </button>
        </div>

        {/* 자동입력 안내 배너 */}
        {autoFilled && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#a6dcb8] bg-[var(--success-soft)] px-4 py-3">
            <span className="text-lg">✓</span>
            <p className="text-[0.95rem] font-medium text-[#1f8c50]">인증번호가 자동으로 입력되었어요.</p>
          </div>
        )}
        {error && (
          <p className="text-[0.95rem] font-medium text-[var(--danger)] mt-3.5">
            인증번호가 일치하지 않아요.
          </p>
        )}

        <button disabled={!filled} onClick={verify} className="t-btn t-btn-primary mt-auto">
          확인
        </button>
      </div>
    </>
  );
}

// 아이폰 문자(SMS) 푸시 알림처럼 보이는 가짜 배너.
// 화면 상단에서 스프링 모션으로 내려오고, 탭하면 인증번호가 자동 입력된다.
function OtpPush({
  state,
  code,
  onTap,
}: {
  state: "hidden" | "in" | "out";
  code: string;
  onTap: () => void;
}) {
  if (state === "hidden") return null;
  const shown = state === "in";
  return (
    <div
      className="absolute inset-x-0 top-0 z-50 px-3 pt-3"
      style={{
        transform: shown ? "translateY(0)" : "translateY(-140%)",
        opacity: shown ? 1 : 0,
        transition: "transform 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease",
        pointerEvents: shown ? "auto" : "none",
      }}
    >
      <button
        onClick={onTap}
        aria-label="문자 인증번호 자동 입력"
        className="w-full flex items-center gap-3 rounded-[1.5rem] px-3.5 py-3 text-left active:scale-[0.98] transition-transform"
        style={{
          background: "rgba(248,248,250,0.72)",
          backdropFilter: "blur(20px) saturate(170%)",
          WebkitBackdropFilter: "blur(20px) saturate(170%)",
          boxShadow: "0 12px 34px -10px rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.55)",
        }}
      >
        <span
          className="shrink-0 w-11 h-11 rounded-[0.7rem] flex items-center justify-center shadow-sm"
          style={{ background: "linear-gradient(180deg,#5af275 0%,#16c13b 100%)" }}
        >
          <MessageIcon />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-[0.95rem] text-[#1c1c1e]">메시지</span>
            <span className="text-[0.72rem] text-[#8a8a8e] shrink-0">지금</span>
          </span>
          <span className="block text-[0.9rem] leading-snug text-[#3a3a3c] mt-0.5">
            [Web발신] 토닥 인증번호 [{code}]를 입력해주세요.
          </span>
        </span>
      </button>
    </div>
  );
}

function MessageIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4.2C6.9 4.2 3 7.5 3 11.6c0 2.3 1.2 4.3 3.2 5.7-.2 1.2-.8 2.4-1.7 3.3 1.7-.2 3.3-.8 4.5-1.7.9.2 1.9.3 3 .3 5.1 0 9-3.3 9-7.6S17.1 4.2 12 4.2Z"
        fill="#fff"
      />
    </svg>
  );
}

function ErrorStep({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex-1 flex flex-col px-6 pt-safe">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--danger-soft)] flex items-center justify-center">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 3.5 22 20H2L12 3.5Z"
              stroke="var(--danger)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path d="M12 10v4" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="17" r="1.1" fill="var(--danger)" />
          </svg>
        </div>
        <h1 className="text-[1.4rem] font-bold mt-6 tracking-tight">등록되지 않은 번호예요.</h1>
        <p className="text-[1rem] text-[var(--muted)] mt-3 leading-relaxed">
          담당 복지사에게 연락하여
          <br />
          번호 등록을 요청해 주세요.
        </p>
      </div>

      <div className="pb-safe space-y-3">
        <button onClick={onRetry} className="t-btn t-btn-primary">
          다시 시도하기
        </button>
        <a href="tel:01000000000" className="t-btn t-btn-soft">
          복지사에게 전화하기
        </a>
      </div>
    </div>
  );
}
