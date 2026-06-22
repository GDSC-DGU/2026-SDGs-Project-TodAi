export type RiskLevel = "긴급" | "주의" | "안정";

export interface BarData {
  isolation: number;
  health: number;
  vitality: number;
  emotion: number;
  cognition: number;
}

export interface ChatMessage {
  speaker: "말동무" | "어르신";
  text: string;
}

export interface WeeklyDay {
  label: string;
  minutes: number;
  score: number;
  isToday?: boolean;
}

export interface WeeklySummaryItem {
  text: string;
  date: string;
  author: string;
  tone: "good" | "warn" | "bad";
}

export interface RadarMetric {
  axis: "사회적 고립" | "건강 불안" | "일상 활력" | "감정 변동" | "인지 부하";
  thisWeek: number;
  lastWeek: number;
}

export interface CaseworkerNote {
  text: string;
  date: string;
  author: string;
  highlight?: boolean;
}

export interface DailyEmotionScore {
  axis: "사회적 고립" | "건강 불안" | "일상 활력" | "감정 변동" | "인지 부하";
  score: number;
  tone: "good" | "warn" | "bad";
}

export interface DailyView {
  dateLabel: string;
  averageScore: number;
  maxScore: number;
  statusLabel: string;
  statusTone: "good" | "warn" | "bad";
  warningLabel: string;
  warningTone: "good" | "warn" | "bad";
  emotionScores: DailyEmotionScore[];
  summary: string;
  totalMessageCount: number;
  hiddenMessageCount: number;
}

export interface WeeklyView {
  rangeLabel: string;
  days: WeeklyDay[];
  totalDuration: string;
  conversationCount: number;
  averageDuration: string;
  averageScore: number;
  maxScore: number;
  statusLabel: string;
  statusTone: "good" | "warn" | "bad";
  warningLabel: string;
  warningTone: "good" | "warn" | "bad";
  aiSummary: {
    emotion: string;
    topics: string;
    notable: string;
    health: string;
  };
  summaryItems: WeeklySummaryItem[];
  radar: RadarMetric[];
  notes: CaseworkerNote[];
}

export interface MonthlyDay {
  day: number;
  score: number | null;
  isToday?: boolean;
}

export interface MonthlyWeekTrend {
  label: string;
  range: string;
  score: number;
}

export interface MonthlyTag {
  icon: string;
  text: string;
  tone: "danger" | "info" | "success";
}

export interface MonthlyView {
  title: string;
  subtitle: string;
  startWeekday: number;
  daysInMonth: number;
  days: MonthlyDay[];
  weekTrend: MonthlyWeekTrend[];
  averageScore: number;
  conversationDays: number;
  maxScore: number;
  minScore: number;
  reportTitle: string;
  reportSubtitle: string;
  tags: MonthlyTag[];
  reportText: string;
}

export interface Member {
  id: number;
  name: string;
  initial: string;
  avatarColor: string;
  age: number;
  lastContact: string;
  lastChatTime: string;
  manager: string;
  tags: { label: string; color: string }[];
  bars: BarData;
  risk: RiskLevel;
  wellbeing: { emotion: number; vitality: number; communication: number; physical: number };
  todayConversations: number;
  totalDuration: string;
  emotionLabel: string;
  aiWarning: string;
  conversationTimeRange: string;
  conversationTimeStart: string;
  conversationDurationMin: number;
  chatLog: ChatMessage[];
  quickMemo: { text: string; date: string };
  daily: DailyView;
  weekly: WeeklyView;
  monthly: MonthlyView;
}

const DEFAULT_CHAT: ChatMessage[] = [
  { speaker: "말동무", text: "안녕하세요 순자님! 오늘 기분은 어떠세요?" },
  { speaker: "어르신", text: "응, 오늘은 날씨가 좋아서 기분이 좋아~" },
  { speaker: "말동무", text: "그러셨군요! 혹시 무릎은 좀 어때요?" },
  { speaker: "어르신", text: "무릎이 좀 쑤시긴 한데... 그냥 참고 있어." },
];

const DEFAULT_DAILY: DailyView = {
  dateLabel: "2025년 5월 8일 (화) · 오늘 대화",
  averageScore: 70,
  maxScore: 90,
  statusLabel: "정상",
  statusTone: "good",
  warningLabel: "없음",
  warningTone: "good",
  emotionScores: [
    { axis: "사회적 고립", score: 85, tone: "good" },
    { axis: "건강 불안", score: 70, tone: "warn" },
    { axis: "일상 활력", score: 90, tone: "good" },
    { axis: "감정 변동", score: 60, tone: "warn" },
    { axis: "인지 부하", score: 30, tone: "bad" },
  ],
  summary:
    "오늘 어르신은 전반적으로 밝고 활기찬 모습을 보이셨습니다. 손자 이야기와 점심 메뉴에 대해 즐겁게 대화하셨으며, 무릎 통증을 3회 언급하셨으나 일상생활에는 큰 지장이 없다고 하셨습니다. 혈압약은 정상적으로 복용하셨고, 수면 상태도 양호합니다. 다만 인지 부하 지표가 다소 낮게 측정되어 추가 관찰이 필요합니다.",
  totalMessageCount: 21,
  hiddenMessageCount: 17,
};

const DEFAULT_WEEKLY: WeeklyView = {
  rangeLabel: "2026년 5월 1일 - 5월 8일",
  days: [
    { label: "월", minutes: 18, score: 85 },
    { label: "화", minutes: 8, score: 32 },
    { label: "수", minutes: 22, score: 68 },
    { label: "목", minutes: 14, score: 40 },
    { label: "금", minutes: 28, score: 80 },
    { label: "토", minutes: 26, score: 80 },
    { label: "일", minutes: 19, score: 70, isToday: true },
  ],
  totalDuration: "1시간 34분",
  conversationCount: 5,
  averageDuration: "18분",
  averageScore: 65,
  maxScore: 80,
  statusLabel: "정상",
  statusTone: "good",
  warningLabel: "없음",
  warningTone: "good",
  summaryItems: [
    {
      text: "우울감 감지 → 방문 일정 조율 필요",
      date: "2025.05.01",
      author: "AI 자동 감지",
      tone: "bad",
    },
    {
      text: "무릎 통증 2회 언급 → 의료지원 필요",
      date: "2025.05.08",
      author: "AI 자동 감지",
      tone: "bad",
    },
  ],
  aiSummary: {
    emotion: "밝고 활기차 보이셨어요",
    topics: "손자 이야기, 날씨, 점심 메뉴",
    notable: "무릎 통증 언급 (3회 반복)",
    health: "혈압약 복용 완료",
  },
  radar: [
    { axis: "사회적 고립", thisWeek: 71, lastWeek: 78 },
    { axis: "건강 불안", thisWeek: 65, lastWeek: 60 },
    { axis: "일상 활력", thisWeek: 80, lastWeek: 80 },
    { axis: "감정 변동", thisWeek: 67, lastWeek: 57 },
    { axis: "인지 부하", thisWeek: 83, lastWeek: 82 },
  ],
  notes: [
    {
      text: "혈압약 복용 확인 필요",
      date: "2025.04.07",
      author: "김복지",
    },
    {
      text: "무릎 통증 반복 언급 — 정형외과 연계 검토",
      date: "2025.04.08",
      author: "AI 감지",
      highlight: true,
    },
  ],
};

const DEFAULT_MONTHLY: MonthlyView = {
  title: "월간 감정지수 - 2026년 5월",
  subtitle: "날짜별 감정지수 (0-100점)",
  startWeekday: 4,
  daysInMonth: 31,
  days: [
    { day: 1, score: 68 },
    { day: 2, score: 67 },
    { day: 3, score: 38 },
    { day: 4, score: 88 },
    { day: 5, score: 68 },
    { day: 6, score: null },
    { day: 7, score: 78 },
    { day: 8, score: 90 },
    { day: 9, score: 88 },
    { day: 10, score: 80 },
    { day: 11, score: 94 },
    { day: 12, score: 74 },
    { day: 13, score: 69 },
    { day: 14, score: 39 },
    { day: 15, score: 71 },
    { day: 16, score: 86 },
    { day: 17, score: 92 },
    { day: 18, score: 85 },
    { day: 19, score: 81 },
    { day: 20, score: 77 },
    { day: 21, score: null, isToday: true },
    { day: 22, score: null },
    { day: 23, score: null },
    { day: 24, score: null },
    { day: 25, score: null },
    { day: 26, score: null },
    { day: 27, score: null },
    { day: 28, score: null },
    { day: 29, score: null },
    { day: 30, score: null },
    { day: 31, score: null },
  ],
  weekTrend: [
    { label: "1주차", range: "4/20~4/26", score: 79 },
    { label: "2주차", range: "4/27~5/3", score: 63 },
    { label: "3주차", range: "5/4~5/10", score: 75 },
    { label: "4주차", range: "5/11~5/17", score: 82 },
  ],
  averageScore: 74.75,
  conversationDays: 28,
  maxScore: 96,
  minScore: 33,
  reportTitle: "월간 분석 리포트 - 2026년 5월",
  reportSubtitle: "최근 4주 종합 분석 및 다음달 권고사항",
  tags: [
    { icon: "⚠", text: "무릎 통증 8회 언급", tone: "danger" },
    { icon: "🏥", text: "정형외과 방문 연계 권장", tone: "info" },
    { icon: "📅", text: "5월 3일 정기 방문 확인", tone: "success" },
  ],
  reportText:
    "김순자 어르신은 5월 한 달 동안 총 19일의 대화를 이어가며 월평균 감정지수 78점을 기록하였습니다. 이는 지난달(65점) 대비 13점 상승한 결과로, 정기적인 AI 대화 습관이 정서 안정에 긍정적인 영향을 미치고 있는 것으로 분석됩니다.\n\n3주차(4월 14~20일)에 80점 이상의 감정 점수가 집중적으로 나타났으며, 5월 11일에는 이달 최고점인 94점을 기록하였습니다. 다만 무릎 통증 관련 언급이 이달 총 8회로 지속적으로 감지되었고, 5월 3일(38점) 저점 당시 건강 우려와 고립감이 복합적으로 나타났습니다. 다음 달에는 정형외과 방문 연계 및 가족과의 연락 빈도 증가를 권장드립니다.",
};

export const members: Member[] = [
  {
    id: 1,
    name: "김말복",
    initial: "김",
    avatarColor: "bg-blue-100 text-blue-700",
    age: 78,
    lastContact: "3일 전",
    lastChatTime: "오늘 10:32",
    manager: "김복지",
    tags: [
      { label: "⚠ 고립감 경고", color: "text-red-500 bg-red-50 border-red-200" },
      { label: "📉 활력 저하", color: "text-orange-500 bg-orange-50 border-orange-200" },
    ],
    bars: { isolation: 3, health: 4, vitality: 2, emotion: 4, cognition: 4 },
    risk: "긴급",
    wellbeing: { emotion: 55, vitality: 40, communication: 45, physical: 60 },
    todayConversations: 1,
    totalDuration: "19분",
    emotionLabel: "😊 밝음",
    aiWarning: "있음",
    conversationTimeRange: "10:32 - 10:51",
    conversationTimeStart: "10:32",
    conversationDurationMin: 19,
    chatLog: DEFAULT_CHAT,
    quickMemo: { text: "고립감 신호 확인 → 방문 일정 조율 필요", date: "2025.04.08" },
    daily: DEFAULT_DAILY,
    weekly: DEFAULT_WEEKLY,
    monthly: DEFAULT_MONTHLY,
  },
  {
    id: 2,
    name: "이순자",
    initial: "이",
    avatarColor: "bg-green-100 text-green-700",
    age: 82,
    lastContact: "2일 전",
    lastChatTime: "오늘 09:45",
    manager: "김복지",
    tags: [{ label: "🩺 건강 불안", color: "text-orange-500 bg-orange-50 border-orange-200" }],
    bars: { isolation: 3, health: 2, vitality: 3, emotion: 3, cognition: 5 },
    risk: "긴급",
    wellbeing: { emotion: 70, vitality: 55, communication: 80, physical: 45 },
    todayConversations: 1,
    totalDuration: "22분",
    emotionLabel: "😐 보통",
    aiWarning: "있음",
    conversationTimeRange: "09:45 - 10:07",
    conversationTimeStart: "09:45",
    conversationDurationMin: 22,
    chatLog: DEFAULT_CHAT,
    quickMemo: { text: "건강 불안 호소 → 방문 진료 필요", date: "2025.04.08" },
    daily: DEFAULT_DAILY,
    weekly: DEFAULT_WEEKLY,
    monthly: DEFAULT_MONTHLY,
  },
  {
    id: 3,
    name: "박창식",
    initial: "박",
    avatarColor: "bg-green-100 text-green-700",
    age: 75,
    lastContact: "어제",
    lastChatTime: "어제 15:20",
    manager: "김복지",
    tags: [{ label: "⚡ 감정 변동", color: "text-orange-500 bg-orange-50 border-orange-200" }],
    bars: { isolation: 3, health: 3, vitality: 4, emotion: 4, cognition: 5 },
    risk: "주의",
    wellbeing: { emotion: 75, vitality: 70, communication: 80, physical: 70 },
    todayConversations: 0,
    totalDuration: "-",
    emotionLabel: "😊 밝음",
    aiWarning: "없음",
    conversationTimeRange: "-",
    conversationTimeStart: "15:20",
    conversationDurationMin: 18,
    chatLog: DEFAULT_CHAT,
    quickMemo: { text: "감정 기복 관찰 필요", date: "2025.04.07" },
    daily: DEFAULT_DAILY,
    weekly: DEFAULT_WEEKLY,
    monthly: DEFAULT_MONTHLY,
  },
  {
    id: 4,
    name: "최영옥",
    initial: "최",
    avatarColor: "bg-amber-100 text-amber-700",
    age: 80,
    lastContact: "어제",
    lastChatTime: "어제 13:11",
    manager: "김복지",
    tags: [{ label: "🧠 인지 부하", color: "text-pink-500 bg-pink-50 border-pink-200" }],
    bars: { isolation: 3, health: 3, vitality: 4, emotion: 4, cognition: 1 },
    risk: "주의",
    wellbeing: { emotion: 70, vitality: 70, communication: 50, physical: 75 },
    todayConversations: 0,
    totalDuration: "-",
    emotionLabel: "😐 보통",
    aiWarning: "있음",
    conversationTimeRange: "-",
    conversationTimeStart: "13:11",
    conversationDurationMin: 15,
    chatLog: DEFAULT_CHAT,
    quickMemo: { text: "인지 검사 결과 재확인", date: "2025.04.07" },
    daily: DEFAULT_DAILY,
    weekly: DEFAULT_WEEKLY,
    monthly: DEFAULT_MONTHLY,
  },
  {
    id: 5,
    name: "정태수",
    initial: "정",
    avatarColor: "bg-green-100 text-green-700",
    age: 71,
    lastContact: "오늘",
    lastChatTime: "오늘 10:32",
    manager: "김복지",
    tags: [{ label: "✅ 특이사항 없음", color: "text-green-600 bg-green-50 border-green-200" }],
    bars: { isolation: 5, health: 4, vitality: 5, emotion: 4, cognition: 4 },
    risk: "안정",
    wellbeing: { emotion: 85, vitality: 70, communication: 90, physical: 60 },
    todayConversations: 1,
    totalDuration: "19분",
    emotionLabel: "😊 밝음",
    aiWarning: "없음",
    conversationTimeRange: "10:32 - 10:51",
    conversationTimeStart: "10:32",
    conversationDurationMin: 19,
    chatLog: DEFAULT_CHAT,
    quickMemo: { text: "무릎 통증 2회 언급 → 방문 일정 조율 필요", date: "2025.04.08" },
    daily: DEFAULT_DAILY,
    weekly: DEFAULT_WEEKLY,
    monthly: DEFAULT_MONTHLY,
  },
  {
    id: 6,
    name: "한동수",
    initial: "한",
    avatarColor: "bg-amber-100 text-amber-700",
    age: 83,
    lastContact: "어제",
    lastChatTime: "어제 16:40",
    manager: "김복지",
    tags: [{ label: "⚡ 감정 변동", color: "text-orange-500 bg-orange-50 border-orange-200" }],
    bars: { isolation: 2, health: 3, vitality: 4, emotion: 2, cognition: 4 },
    risk: "주의",
    wellbeing: { emotion: 60, vitality: 55, communication: 65, physical: 70 },
    todayConversations: 0,
    totalDuration: "-",
    emotionLabel: "😐 보통",
    aiWarning: "있음",
    conversationTimeRange: "-",
    conversationTimeStart: "16:40",
    conversationDurationMin: 14,
    chatLog: DEFAULT_CHAT,
    quickMemo: { text: "우울감 호소 - 상담 예약", date: "2025.04.07" },
    daily: DEFAULT_DAILY,
    weekly: DEFAULT_WEEKLY,
    monthly: DEFAULT_MONTHLY,
  },
  {
    id: 7,
    name: "오영희",
    initial: "오",
    avatarColor: "bg-green-100 text-green-700",
    age: 71,
    lastContact: "오늘",
    lastChatTime: "오늘 08:55",
    manager: "김복지",
    tags: [{ label: "✅ 특이사항 없음", color: "text-green-600 bg-green-50 border-green-200" }],
    bars: { isolation: 4, health: 4, vitality: 4, emotion: 4, cognition: 4 },
    risk: "안정",
    wellbeing: { emotion: 90, vitality: 80, communication: 88, physical: 75 },
    todayConversations: 1,
    totalDuration: "21분",
    emotionLabel: "😊 밝음",
    aiWarning: "없음",
    conversationTimeRange: "08:55 - 09:16",
    conversationTimeStart: "08:55",
    conversationDurationMin: 21,
    chatLog: DEFAULT_CHAT,
    quickMemo: { text: "이상 무", date: "2025.04.08" },
    daily: DEFAULT_DAILY,
    weekly: DEFAULT_WEEKLY,
    monthly: DEFAULT_MONTHLY,
  },
  {
    id: 8,
    name: "신철수",
    initial: "신",
    avatarColor: "bg-red-100 text-red-700",
    age: 88,
    lastContact: "5일 전",
    lastChatTime: "5일 전",
    manager: "김복지",
    tags: [{ label: "🩺 건강 불안", color: "text-red-500 bg-red-50 border-red-200" }],
    bars: { isolation: 1, health: 1, vitality: 4, emotion: 2, cognition: 2 },
    risk: "긴급",
    wellbeing: { emotion: 30, vitality: 25, communication: 20, physical: 35 },
    todayConversations: 0,
    totalDuration: "-",
    emotionLabel: "😢 우울",
    aiWarning: "있음",
    conversationTimeRange: "-",
    conversationTimeStart: "10:00",
    conversationDurationMin: 0,
    chatLog: DEFAULT_CHAT,
    quickMemo: { text: "연락 두절 - 긴급 방문 필요", date: "2025.04.08" },
    daily: {
      ...DEFAULT_DAILY,
      averageScore: 35,
      maxScore: 50,
      statusLabel: "위험",
      statusTone: "bad",
      warningLabel: "있음",
      warningTone: "bad",
      emotionScores: [
        { axis: "사회적 고립", score: 20, tone: "bad" },
        { axis: "건강 불안", score: 25, tone: "bad" },
        { axis: "일상 활력", score: 30, tone: "bad" },
        { axis: "감정 변동", score: 40, tone: "warn" },
        { axis: "인지 부하", score: 35, tone: "bad" },
      ],
      summary:
        "어르신과 5일째 연락이 닿지 않고 있습니다. 마지막 대화 내용을 분석한 결과 우울감과 외로움을 호소하셨고, 식사를 거르신다는 언급이 있었습니다. 긴급 방문 및 보호자 연락이 필요합니다.",
      totalMessageCount: 0,
      hiddenMessageCount: 0,
    },
    weekly: DEFAULT_WEEKLY,
    monthly: DEFAULT_MONTHLY,
  },
];
