// 토닥이 — 서비스 마스코트.
// 따뜻한 주황 말풍선 캐릭터. 앱 아이콘과 같은 정체성을 공유한다.
// size 로 크기를, float 로 둥실 떠 있는 숨쉬기 모션을, mood 로 표정을 바꾼다.

type Mood = "happy" | "idle" | "sleepy";

export default function Mascot({
  size = 112,
  float = false,
  mood = "happy",
  className = "",
}: {
  size?: number;
  float?: boolean;
  mood?: Mood;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      role="img"
      aria-label="말동무 토닥이"
      className={`${float ? "t-float" : ""} ${className}`}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="todak-body" x1="28" y1="16" x2="92" y2="104" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffac74" />
          <stop offset="0.55" stopColor="#f4884f" />
          <stop offset="1" stopColor="#e76d34" />
        </linearGradient>
        <radialGradient id="todak-shine" cx="0.35" cy="0.28" r="0.5">
          <stop stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 몸통 — 둥근 말풍선, 왼쪽 아래 꼬리 */}
      <path
        d="M60 14C30.7 14 14 32.6 14 56.5c0 13.8 6.4 25.8 17.1 33.7-.4 6.2-2.5 12-6.2 17 8.7-1.2 16.2-4.6 22.3-9.6 4.1 1 8.4 1.6 12.8 1.6 29.3 0 46-18.6 46-42.7C106 32.6 89.3 14 60 14Z"
        fill="url(#todak-body)"
      />
      {/* 윗부분 광택 */}
      <path
        d="M60 14C30.7 14 14 32.6 14 56.5c0 13.8 6.4 25.8 17.1 33.7-.4 6.2-2.5 12-6.2 17 8.7-1.2 16.2-4.6 22.3-9.6 4.1 1 8.4 1.6 12.8 1.6 29.3 0 46-18.6 46-42.7C106 32.6 89.3 14 60 14Z"
        fill="url(#todak-shine)"
      />

      {/* 볼터치 */}
      <ellipse cx="38" cy="62" rx="7.5" ry="5.5" fill="#ff5e7a" opacity="0.32" />
      <ellipse cx="82" cy="62" rx="7.5" ry="5.5" fill="#ff5e7a" opacity="0.32" />

      {/* 눈 */}
      {mood === "sleepy" ? (
        <>
          <path d="M40 50c3 3.5 9 3.5 12 0" stroke="#3a2415" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M68 50c3 3.5 9 3.5 12 0" stroke="#3a2415" strokeWidth="3.4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="46" cy="49" r="5.6" fill="#3a2415" />
          <circle cx="74" cy="49" r="5.6" fill="#3a2415" />
          <circle cx="48" cy="47" r="1.9" fill="#fff" />
          <circle cx="76" cy="47" r="1.9" fill="#fff" />
        </>
      )}

      {/* 입 */}
      {mood === "happy" ? (
        <path
          d="M50 62c3.4 5.2 16.6 5.2 20 0"
          stroke="#3a2415"
          strokeWidth="3.6"
          strokeLinecap="round"
          fill="none"
        />
      ) : (
        <path
          d="M53 63c2.4 2.6 11.6 2.6 14 0"
          stroke="#3a2415"
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}
