"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 하단 탭바: 홈 · 보이스톡 · 채팅 · 설정. 활성 탭은 따뜻한 주황으로 강조.
export default function BottomNav() {
  const p = usePathname();
  const tabs = [
    { key: "home", label: "홈 화면", href: "/", active: p === "/", icon: HomeIcon },
    {
      key: "voice",
      label: "보이스톡",
      href: "/call",
      active: p.startsWith("/call") || p.startsWith("/voice"),
      icon: VoiceIcon,
    },
    { key: "chat", label: "채팅", href: "/chat", active: p.startsWith("/chat"), icon: ChatIcon },
    { key: "settings", label: "설정", href: "/settings", active: p.startsWith("/settings"), icon: GearIcon },
  ];

  return (
    <nav className="shrink-0 bg-[var(--surface)] border-t border-[var(--border)] px-2 pt-2 pb-safe">
      <ul className="flex items-stretch">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <li key={t.key} className="flex-1">
              <Link
                href={t.href}
                aria-label={t.label}
                aria-current={t.active ? "page" : undefined}
                className="flex flex-col items-center gap-1 py-1.5 rounded-2xl active:bg-[var(--surface-sunken)] transition-colors"
                style={{ color: t.active ? "var(--primary)" : "#a59c8e" }}
              >
                <Icon active={t.active} />
                <span className={`text-[0.78rem] ${t.active ? "font-bold" : "font-medium"}`}>
                  {t.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-9.5Z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VoiceIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 4h2l1.4 3.6-1.8 1.3a11 11 0 0 0 5 5l1.3-1.8L18 15.5v2a2 2 0 0 1-2.2 2A14 14 0 0 1 4.5 8.2 2 2 0 0 1 6.5 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M15 4.5a4.5 4.5 0 0 1 4.5 4.5M15 8a1.5 1.5 0 0 1 1.5 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H6a2 2 0 0 1-2-2V6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
