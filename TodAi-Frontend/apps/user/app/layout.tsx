import type { Metadata, Viewport } from "next";
import "./globals.css";
import Splash from "./_Splash";
import FirstRunGate from "./_FirstRunGate";

export const metadata: Metadata = {
  title: "토닥 - 오늘의 이야기",
  description: "매일 안부를 나누는 AI 말동무, 토닥이",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "토닥",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#e8804f",
  width: "device-width",
  initialScale: 1,
  // 어르신 접근성: 확대 제스처를 막지 않는다.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      {/* 바깥은 데스크톱에서 보일 배경, 안쪽은 모바일 폭으로 고정된 앱 컬럼 */}
      <body className="min-h-[100dvh] flex justify-center bg-[#efe7da]">
        {/* 저장된 글씨 크기를 첫 페인트 전에 적용 (깜빡임 방지) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var v=localStorage.getItem('todak_font_px');if(v)document.documentElement.style.fontSize=v+'px';}catch(e){}})();`,
          }}
        />
        <div className="relative w-full max-w-[468px] min-h-[100dvh] flex flex-col overflow-hidden bg-[var(--background)] shadow-2xl">
          {children}
          <FirstRunGate />
          <Splash />
        </div>
      </body>
    </html>
  );
}
