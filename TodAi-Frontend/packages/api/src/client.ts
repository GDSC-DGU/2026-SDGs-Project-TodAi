import type { ApiElder, ApiResponse } from "./types";

/**
 * 어르신 명단을 가져온다.
 * 기본 경로는 각 앱의 next.config rewrites(`/proxy/*` → API_BASE_URL)를 거친다.
 */
export async function fetchElders(path = "/proxy/api/main"): Promise<ApiElder[]> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`API 요청 실패: ${res.status}`);
  const json = (await res.json()) as ApiResponse;
  return json.data ?? [];
}
