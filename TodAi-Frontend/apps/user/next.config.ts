import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 워크스페이스 공유 패키지(@todai/api)는 TS 소스 그대로 배포되므로 트랜스파일 대상에 포함한다.
  transpilePackages: ["@todai/api"],
  async rewrites() {
    // API_BASE_URL 이 없으면(예: 환경변수 미설정 빌드) destination 이 undefined 가 되어
    // "Invalid rewrite" 로 빌드가 깨진다. 값이 있을 때만 프록시 rewrite 를 추가한다.
    const apiBase = process.env.API_BASE_URL;
    if (!apiBase) return [];
    return [
      {
        source: "/proxy/:path*",
        destination: `${apiBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
