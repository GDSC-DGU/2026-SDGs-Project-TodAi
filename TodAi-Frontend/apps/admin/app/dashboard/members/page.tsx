"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type FilterType = "전체" | "대화 필요" | "주의" | "정상";
type Severity = "정상" | "주의" | "위험" | "대화 필요";

type ApiGender = "MALE" | "FEMALE";
type ApiStatus = "DANGER" | "WARNING" | "STABLE";

interface ApiElder {
  elder_id: number;
  name: string;
  age: number;
  gender: ApiGender;
  weekly_conv: number;
  score: number[];
  status: ApiStatus;
}

interface ApiResponse {
  data: ApiElder[];
}

const STATUS_TO_SEVERITY: Record<ApiStatus, Severity> = {
  STABLE: "정상",
  WARNING: "주의",
  DANGER: "대화 필요",
};

const STATUS_EDGE_COLOR: Record<ApiStatus, string> = {
  STABLE: "bg-green-400",
  WARNING: "bg-amber-400",
  DANGER: "bg-red-400",
};

const STATUS_AVATAR_COLOR: Record<ApiStatus, string> = {
  STABLE: "bg-green-100 text-green-700",
  WARNING: "bg-amber-100 text-amber-700",
  DANGER: "bg-red-100 text-red-700",
};

function scoreToBar(score: number | undefined): number {
  if (score === undefined || score === null) return 0;
  return Math.max(1, Math.min(5, Math.round((score / 100) * 5)));
}

function buildAiTags(elder: ApiElder): AiTag[] {
  if (!elder.score || elder.score.length === 0) {
    if (elder.status === "DANGER") return [{ label: "긴급 점검 필요", tone: "danger" }];
    if (elder.status === "WARNING") return [{ label: "주의 관찰", tone: "warning" }];
    return [{ label: "이상 없음", tone: "neutral" }];
  }

  const labels: { idx: number; label: string }[] = [
    { idx: 0, label: "고립감" },
    { idx: 1, label: "인지부하" },
    { idx: 2, label: "감정변동" },
    { idx: 3, label: "활력저하" },
    { idx: 4, label: "건강불안" },
  ];
  const flagged = labels
    .map((l) => ({ ...l, score: elder.score[l.idx] ?? 0 }))
    .filter((l) => l.score < 50);

  if (flagged.length === 0) return [{ label: "이상 없음", tone: "neutral" }];

  return flagged.slice(0, 3).map((l) => ({
    label: l.label,
    tone: l.score < 30 ? "danger" : "warning",
  }));
}

function elderToMember(elder: ApiElder): Member {
  const [isolation = 0, cognition = 0, emotion = 0, vitality = 0, health = 0] = elder.score ?? [];
  return {
    id: elder.elder_id,
    name: elder.name,
    initial: elder.name.charAt(0),
    avatarColor: STATUS_AVATAR_COLOR[elder.status],
    edgeColor: STATUS_EDGE_COLOR[elder.status],
    age: elder.age,
    gender: elder.gender === "MALE" ? "남" : "여",
    lastChat: "-",
    chatCount: elder.weekly_conv,
    riskLevel: STATUS_TO_SEVERITY[elder.status],
    emotionBars: {
      isolation: scoreToBar(isolation),
      health: scoreToBar(health),
      vitality: scoreToBar(vitality),
      emotion: scoreToBar(emotion),
      cognition: scoreToBar(cognition),
    },
    aiTags: buildAiTags(elder),
    memo: "",
    phone: "",
    registeredAt: "",
    address: "",
    guardian: "",
    appStatus: "",
    activeStatus: "",
    visits: [],
    services: [],
  };
}

interface VisitRecord {
  date: string;
  note: string;
}

interface ServiceUsage {
  name: string;
  frequency: string;
}

interface EmotionBars {
  isolation: number;
  health: number;
  vitality: number;
  emotion: number;
  cognition: number;
}

interface AiTag {
  label: string;
  tone: "neutral" | "warning" | "danger";
}

interface Member {
  id: number;
  name: string;
  initial: string;
  avatarColor: string;
  edgeColor: string;
  age: number;
  gender: string;
  lastChat: string;
  chatCount: number;
  riskLevel: Severity;
  emotionBars: EmotionBars;
  aiTags: AiTag[];
  memo: string;
  phone: string;
  registeredAt: string;
  address: string;
  guardian: string;
  appStatus: string;
  activeStatus: string;
  visits: VisitRecord[];
  services: ServiceUsage[];
}

const DEFAULT_VISITS: VisitRecord[] = [
  { date: "2025.05.01", note: "건강 상태 양호, 약 복용 확인" },
  { date: "2025.04.24", note: "혈압 측정 (130/85), 이상 없음" },
  { date: "2025.04.17", note: "보호자 상담, 활동 지원 신청" },
];

const DEFAULT_SERVICES: ServiceUsage[] = [
  { name: "식사 배달", frequency: "주 5회" },
  { name: "방문 요양", frequency: "주 3회" },
  { name: "의료 지원", frequency: "월 1회" },
];

const members: Member[] = [
  {
    id: 1,
    name: "김순자",
    initial: "김",
    avatarColor: "bg-green-100 text-green-700",
    edgeColor: "bg-green-400",
    age: 78,
    gender: "여",
    lastChat: "오늘 10:32",
    chatCount: 5,
    riskLevel: "정상",
    emotionBars: { isolation: 4, health: 4, vitality: 4, emotion: 4, cognition: 4 },
    aiTags: [{ label: "이상 없음", tone: "neutral" }],
    memo: "혈압약 복용 확인 필요",
    phone: "010-1111-2222",
    registeredAt: "2025.03.10",
    address: "서울시 강남구 테헤란로 123",
    guardian: "김영희 (딸) · 010-9876-5432",
    appStatus: "앱 설치",
    activeStatus: "활성",
    visits: DEFAULT_VISITS,
    services: DEFAULT_SERVICES,
  },
  {
    id: 2,
    name: "박영수",
    initial: "박",
    avatarColor: "bg-green-100 text-green-700",
    edgeColor: "bg-green-400",
    age: 82,
    gender: "남",
    lastChat: "오늘 09:15",
    chatCount: 4,
    riskLevel: "정상",
    emotionBars: { isolation: 4, health: 4, vitality: 4, emotion: 4, cognition: 4 },
    aiTags: [{ label: "이상 없음", tone: "neutral" }],
    memo: "손자 방문 예정 (토요일)",
    phone: "010-2222-3333",
    registeredAt: "2025.02.18",
    address: "서울시 송파구 올림픽로 45",
    guardian: "박지민 (아들) · 010-8765-4321",
    appStatus: "앱 설치",
    activeStatus: "활성",
    visits: DEFAULT_VISITS,
    services: DEFAULT_SERVICES,
  },
  {
    id: 3,
    name: "이복순",
    initial: "이",
    avatarColor: "bg-amber-100 text-amber-700",
    edgeColor: "bg-amber-400",
    age: 75,
    gender: "여",
    lastChat: "어제 14:20",
    chatCount: 2,
    riskLevel: "주의",
    emotionBars: { isolation: 2, health: 3, vitality: 4, emotion: 4, cognition: 1 },
    aiTags: [{ label: "인지부하", tone: "warning" }],
    memo: "식사량 감소 - 체크 필요",
    phone: "010-3333-4444",
    registeredAt: "2025.01.22",
    address: "서울시 마포구 월드컵로 88",
    guardian: "이수진 (딸) · 010-7654-3210",
    appStatus: "앱 설치",
    activeStatus: "활성",
    visits: DEFAULT_VISITS,
    services: DEFAULT_SERVICES,
  },
  {
    id: 4,
    name: "최기수",
    initial: "최",
    avatarColor: "bg-red-100 text-red-700",
    edgeColor: "bg-red-400",
    age: 86,
    gender: "남",
    lastChat: "3일 전",
    chatCount: 1,
    riskLevel: "대화 필요",
    emotionBars: { isolation: 2, health: 1, vitality: 4, emotion: 2, cognition: 2 },
    aiTags: [
      { label: "고립량↑", tone: "warning" },
      { label: "활력↓", tone: "warning" },
    ],
    memo: "낙상 이력 있음, 방문 예정",
    phone: "010-4444-5555",
    registeredAt: "2024.12.05",
    address: "서울시 강서구 화곡로 12",
    guardian: "최민호 (아들) · 010-6543-2109",
    appStatus: "앱 설치",
    activeStatus: "비활성",
    visits: DEFAULT_VISITS,
    services: DEFAULT_SERVICES,
  },
  {
    id: 5,
    name: "정말순",
    initial: "정",
    avatarColor: "bg-green-100 text-green-700",
    edgeColor: "bg-green-400",
    age: 79,
    gender: "여",
    lastChat: "오늘 11:05",
    chatCount: 6,
    riskLevel: "정상",
    emotionBars: { isolation: 2, health: 4, vitality: 4, emotion: 4, cognition: 4 },
    aiTags: [{ label: "이상 없음", tone: "neutral" }],
    memo: "이상 무",
    phone: "010-5555-6666",
    registeredAt: "2025.04.02",
    address: "서울시 노원구 동일로 250",
    guardian: "정수민 (딸) · 010-5432-1098",
    appStatus: "앱 설치",
    activeStatus: "활성",
    visits: DEFAULT_VISITS,
    services: DEFAULT_SERVICES,
  },
  {
    id: 6,
    name: "한동수",
    initial: "한",
    avatarColor: "bg-amber-100 text-amber-700",
    edgeColor: "bg-amber-400",
    age: 83,
    gender: "남",
    lastChat: "어제 16:40",
    chatCount: 3,
    riskLevel: "주의",
    emotionBars: { isolation: 2, health: 3, vitality: 4, emotion: 2, cognition: 4 },
    aiTags: [{ label: "고립량↑", tone: "warning" }],
    memo: "우울감 호소 - 상담 예약",
    phone: "010-6666-7777",
    registeredAt: "2025.02.27",
    address: "서울시 영등포구 여의대로 70",
    guardian: "한지훈 (아들) · 010-4321-0987",
    appStatus: "앱 설치",
    activeStatus: "활성",
    visits: DEFAULT_VISITS,
    services: DEFAULT_SERVICES,
  },
  {
    id: 7,
    name: "오영희",
    initial: "오",
    avatarColor: "bg-green-100 text-green-700",
    edgeColor: "bg-green-400",
    age: 71,
    gender: "여",
    lastChat: "오늘 08:55",
    chatCount: 6,
    riskLevel: "정상",
    emotionBars: { isolation: 4, health: 4, vitality: 4, emotion: 4, cognition: 4 },
    aiTags: [{ label: "이상 없음", tone: "neutral" }],
    memo: "이상 무",
    phone: "010-7777-8888",
    registeredAt: "2025.03.30",
    address: "서울시 종로구 종로 1가",
    guardian: "오현우 (아들) · 010-3210-9876",
    appStatus: "앱 설치",
    activeStatus: "활성",
    visits: DEFAULT_VISITS,
    services: DEFAULT_SERVICES,
  },
  {
    id: 8,
    name: "신철수",
    initial: "신",
    avatarColor: "bg-red-100 text-red-700",
    edgeColor: "bg-red-400",
    age: 88,
    gender: "남",
    lastChat: "5일 전",
    chatCount: 0,
    riskLevel: "대화 필요",
    emotionBars: { isolation: 2, health: 1, vitality: 4, emotion: 2, cognition: 2 },
    aiTags: [{ label: "건강불안", tone: "danger" }],
    memo: "연락 두절 - 긴급 방문 필요",
    phone: "010-8888-9999",
    registeredAt: "2024.11.15",
    address: "서울시 은평구 통일로 980",
    guardian: "신유진 (딸) · 010-2109-8765",
    appStatus: "앱 설치",
    activeStatus: "비활성",
    visits: DEFAULT_VISITS,
    services: DEFAULT_SERVICES,
  },
];

const SEVERITY_BADGE: Record<Severity, string> = {
  정상: "bg-green-100 text-green-600",
  주의: "bg-amber-100 text-amber-700",
  위험: "bg-red-100 text-red-600",
  "대화 필요": "bg-red-100 text-red-600",
};

const TAG_TONE: Record<AiTag["tone"], string> = {
  neutral: "bg-gray-100 text-gray-600",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-600",
};

function ChatGauge({ count }: { count: number }) {
  const total = 7;
  const filled = Math.max(0, Math.min(total, count));
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full ${i < filled ? "bg-blue-500" : "bg-gray-200"}`}
          />
        ))}
      </div>
      <span className="text-xs text-gray-500 ml-1">{count}회</span>
    </div>
  );
}

function EmotionGraph({ bars }: { bars: EmotionBars }) {
  const items: { key: keyof EmotionBars; label: string }[] = [
    { key: "isolation", label: "고립" },
    { key: "health", label: "건강" },
    { key: "vitality", label: "활력" },
    { key: "emotion", label: "감정" },
    { key: "cognition", label: "인지" },
  ];

  const colorFor = (v: number) => {
    if (v >= 4) return "bg-green-500";
    if (v >= 3) return "bg-amber-400";
    if (v >= 2) return "bg-orange-400";
    return "bg-red-500";
  };

  return (
    <div className="flex items-end gap-1.5">
      {items.map(({ key, label }) => {
        const value = bars[key];
        const heightPct = (value / 5) * 100;
        return (
          <div key={key} className="flex flex-col items-center gap-1">
            <div className="w-3 h-7 bg-gray-100 rounded-sm overflow-hidden flex items-end">
              <div
                className={`w-full rounded-sm ${colorFor(value)}`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <span className="text-[9px] text-gray-400">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function MembersPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [apiMembers, setApiMembers] = useState<Member[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/proxy/api/main");
        if (!res.ok) throw new Error(`API 요청 실패: ${res.status}`);
        const json = (await res.json()) as ApiResponse;
        if (!cancelled) {
          setApiMembers((json.data ?? []).map(elderToMember));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "데이터를 불러올 수 없습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filters: FilterType[] = ["전체", "대화 필요", "주의", "정상"];

  // 로딩 중에는 Mock 명단을 잠깐 보여주지 않고 API 데이터만 사용한다.
  // (API 실패 시에만 폴백으로 Mock 명단을 노출)
  const sourceMembers = apiMembers ?? (error ? members : []);
  const filteredMembers = sourceMembers
    .filter((m) => {
      if (activeFilter === "전체") return true;
      return m.riskLevel === activeFilter;
    })
    .filter((m) => (searchQuery ? m.name.includes(searchQuery) : true));

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">통합 인원관리</h1>
        <p className="text-sm text-gray-500 mt-1">
          담당 어르신 실시간 통합 현황 · 총 {sourceMembers.length}명 관리 중
          {loading && <span className="ml-2 text-blue-500">불러오는 중…</span>}
          {error && <span className="ml-2 text-red-500">{error}</span>}
        </p>
      </div>

      {/* Filter row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="이름으로 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="flex items-center gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-5 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  activeFilter === filter
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <button className="text-sm text-gray-500 flex items-center gap-1">
          최근 대화순 <span className="text-xs">▼</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full table-fixed">
          <thead>
            <tr className="bg-white border-b border-gray-100">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                이름 | 나이 | 성별
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                마지막 대화
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                이번주 대화
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">위험 단계</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">감정 지표</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                AI 분석 태그
              </th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((member) => (
              <tr
                key={member.id}
                className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 relative"
              >
                <td className="py-4 px-4 relative">
                  <span
                    className={`absolute left-0 top-2 bottom-2 w-1 rounded-r ${member.edgeColor}`}
                  />
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 ${member.avatarColor} rounded-full flex items-center justify-center text-sm font-bold`}
                    >
                      {member.initial}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {member.age} / {member.gender}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-sm text-gray-700">{member.lastChat}</td>
                <td className="py-4 px-4">
                  <ChatGauge count={member.chatCount} />
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`inline-block text-xs font-semibold px-4 py-1.5 rounded-full ${SEVERITY_BADGE[member.riskLevel]}`}
                  >
                    {member.riskLevel}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <EmotionGraph bars={member.emotionBars} />
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-wrap gap-1.5">
                    {member.aiTags.map((tag) => (
                      <span
                        key={tag.label}
                        className={`text-xs font-medium px-2.5 py-1 rounded-md ${TAG_TONE[tag.tone]}`}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <Link
                    href={{
                      pathname: `/dashboard/members/${member.id}`,
                      query: {
                        name: member.name,
                        risk: member.riskLevel,
                      },
                    }}
                    className="inline-block text-sm text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg px-4 py-1.5 font-medium whitespace-nowrap"
                  >
                    상세보기
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">전체 15개 중 1-8 표시</p>
          <div className="flex items-center gap-1">
            <button
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              이전
            </button>
            {[1, 2].map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-sm font-medium ${
                  currentPage === page
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              onClick={() => setCurrentPage((p) => Math.min(2, p + 1))}
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
