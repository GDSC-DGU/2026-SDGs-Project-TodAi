// TodAi 백엔드 API 계약(contract). admin / user 앱이 공유한다.

export type ApiGender = "MALE" | "FEMALE";
export type ApiStatus = "DANGER" | "WARNING" | "STABLE";

/** GET /api/main 의 단일 어르신 레코드 */
export interface ApiElder {
  elder_id: number;
  name: string;
  age: number;
  gender: ApiGender;
  weekly_conv: number;
  /** [고립감, 인지부하, 감정변동, 활력저하, 건강불안] (0~100) */
  score: number[];
  status: ApiStatus;
}

export interface ApiResponse {
  data: ApiElder[];
}

/** UI 공통 위험 단계 표기 */
export type Severity = "정상" | "주의" | "위험" | "대화 필요";

export const STATUS_TO_SEVERITY: Record<ApiStatus, Severity> = {
  STABLE: "정상",
  WARNING: "주의",
  DANGER: "대화 필요",
};

/** score 항목 라벨 (인덱스 순서 고정) */
export const SCORE_LABELS = [
  "고립감",
  "인지부하",
  "감정변동",
  "활력저하",
  "건강불안",
] as const;
