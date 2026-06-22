"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href?: string;
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: "대시보드",
    items: [{ label: "인원관리", href: "/dashboard/members" }],
  },
  {
    title: "서비스 연계",
    items: [
      { label: "담당명단", href: "/dashboard/roster" },
      { label: "사용자 등록", href: "/dashboard/users/new" },
      { label: "앱 수동설정" },
    ],
  },
  {
    title: "설정",
    items: [{ label: "환경 설정" }],
  },
];

function NavRow({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  const baseClass =
    "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-out";
  const stateClass = active
    ? "bg-blue-600 text-white shadow-sm"
    : item.href
      ? "text-slate-300 hover:bg-slate-700/70 hover:text-white hover:translate-x-0.5"
      : "text-slate-400/80 cursor-not-allowed";

  const content = (
    <>
      <span
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-r-full bg-white transition-all duration-200 ${
          active ? "h-5 opacity-100" : "h-0 opacity-0"
        }`}
      />
      <span
        className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
          active ? "bg-white scale-110" : "bg-current"
        } ${item.href && !active ? "group-hover:scale-125" : ""}`}
      />
      <span>{item.label}</span>
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} className={`${baseClass} ${stateClass}`}>
        {content}
      </Link>
    );
  }

  return <div className={`${baseClass} ${stateClass}`}>{content}</div>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen">
      <aside className="w-60 bg-slate-800 text-slate-200 flex flex-col shrink-0">
        <div className="p-4 flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt="TodAi"
            width={48}
            height={28}
            priority
            className="transition-transform duration-200 hover:scale-105"
          />
          <div>
            <p className="font-semibold text-sm">TodAi</p>
            <p className="text-xs text-slate-400">사회복지사 관리 시스템</p>
          </div>
        </div>

        <div className="px-4 pb-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.4c-3.3 0-9.8 1.6-9.8 4.9v2.4h19.6v-2.4c0-3.3-6.5-4.9-9.8-4.9z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold">김복지</p>
            <p className="text-xs text-slate-400">사회복지사</p>
          </div>
        </div>

        <nav className="flex-1 px-4 pb-4 text-sm">
          {navSections.map((section) => (
            <div key={section.title} className="mb-5 last:mb-0">
              <p className="text-xs text-slate-400 mb-2 px-3">{section.title}</p>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.label}>
                    <NavRow item={item} active={pathname === item.href} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
    </div>
  );
}
