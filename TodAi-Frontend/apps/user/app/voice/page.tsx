"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import BottomNav from "../_BottomNav";

// 미들웨어 WS (PCM 16bit/16kHz/mono 바이너리 스트리밍). 마이크 → STT/감정 → 대답(TTS) 수신.
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8090/ws";
const TARGET_SR = 16000;

// Float32(브라우저 샘플레이트) → 16kHz Int16 PCM 다운샘플
function toPcm16(float32: Float32Array, inRate: number): ArrayBuffer {
  const ratio = inRate / TARGET_SR;
  const outLen = Math.floor(float32.length / ratio);
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const s = Math.max(-1, Math.min(1, float32[Math.floor(i * ratio)]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out.buffer;
}

export default function VoicePage() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [talking, setTalking] = useState(false);
  const [status, setStatus] = useState("연결 중…");
  const [caption, setCaption] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const playCtxRef = useRef<AudioContext | null>(null);

  // 대답 오디오(PCM16 base64) 재생
  const playReply = useCallback((b64: string, sr: number) => {
    try {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const pcm = new Int16Array(bytes.buffer);
      const f32 = new Float32Array(pcm.length);
      for (let i = 0; i < pcm.length; i++) f32[i] = pcm[i] / 0x8000;
      if (!playCtxRef.current) playCtxRef.current = new AudioContext();
      const ctx = playCtxRef.current;
      const buf = ctx.createBuffer(1, f32.length, sr || TARGET_SR);
      buf.getChannelData(0).set(f32);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start();
    } catch (e) {
      console.error("reply audio play failed", e);
    }
  }, []);

  // WS 연결 + 대답 수신
  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;
    ws.onopen = () => setStatus("온라인");
    ws.onclose = () => setStatus("연결 종료");
    ws.onerror = () => setStatus("연결 오류");
    ws.onmessage = (ev) => {
      if (typeof ev.data !== "string") return;
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "reply") {
          setCaption(msg.text || "");
          if (msg.audio_b64) playReply(msg.audio_b64, msg.sample_rate || TARGET_SR);
        }
      } catch {
        /* ignore */
      }
    };
    return () => ws.close();
  }, [playReply]);

  // 통화 시간
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // 말하기 ON → 마이크 캡처 시작 / OFF → 정지
  useEffect(() => {
    let cancelled = false;
    async function startMic() {
      if (talking && !muted && !streamRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          const ctx = new AudioContext();
          ctxRef.current = ctx;
          const src = ctx.createMediaStreamSource(stream);
          const proc = ctx.createScriptProcessor(4096, 1, 1);
          procRef.current = proc;
          proc.onaudioprocess = (e) => {
            const ws = wsRef.current;
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            const pcm = toPcm16(e.inputBuffer.getChannelData(0), ctx.sampleRate);
            ws.send(pcm);
          };
          src.connect(proc);
          proc.connect(ctx.destination);
          setStatus("듣고 있어요…");
        } catch {
          setStatus("마이크 권한 필요");
          setTalking(false);
        }
      }
    }
    function stopMic() {
      procRef.current?.disconnect();
      procRef.current = null;
      ctxRef.current?.close();
      ctxRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (talking && !muted) startMic();
    else stopMic();
    return () => {
      cancelled = true;
    };
  }, [talking, muted]);

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      if (next) setTalking(false);
      return next;
    });
  }

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;

  return (
    <main className="flex flex-col h-[100dvh] w-full bg-[var(--background)]">
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
            {status}
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

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6">
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

        {/* 토닥이 대답 자막 */}
        {caption && (
          <p className="mt-5 max-w-[320px] text-center text-[1.05rem] leading-relaxed text-[var(--muted-strong)] bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3">
            {caption}
          </p>
        )}

        <div className="flex items-center justify-center gap-[3px] h-14 mt-5 w-full max-w-[300px]">
          {Array.from({ length: 30 }).map((_, i) => {
            const base = 8 + Math.round(20 * Math.abs(Math.sin(i * 0.9 + 0.5)));
            const op = Math.round((0.55 + 0.45 * Math.abs(Math.sin(i * 0.9))) * 100) / 100;
            const delay = (i * 5) / 100;
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
