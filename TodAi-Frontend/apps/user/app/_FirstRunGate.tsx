"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export const ONBOARDED_KEY = "todak_onboarded";
export const AUTHED_KEY = "todak_authed";

// 진입 가드: 콜드 스타트 직후 실행되며 스플래시 오버레이가 화면을 덮고 있어 깜빡임이 보이지 않는다.
// 미온보딩 → /onboarding, 온보딩 완료·미인증 → /login 으로 보낸다.
export default function FirstRunGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/onboarding" || pathname === "/login") return;
    if (!localStorage.getItem(ONBOARDED_KEY)) {
      router.replace("/onboarding");
      return;
    }
    if (!localStorage.getItem(AUTHED_KEY)) {
      router.replace("/login");
    }
  }, [pathname, router]);

  return null;
}
