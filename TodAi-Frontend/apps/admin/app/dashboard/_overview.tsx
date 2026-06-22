"use client";

import { useState, useEffect } from "react";

enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
}

enum Status {
  DANGER = "DANGER",
  WARNING = "WARNING",
  STABLE = "STABLE",
}

interface Elder {
  elder_id: number;
  name: string;
  age: number;
  gender: Gender;
  weekly_conv: number;
  score: number[];
  status: Status;
}

const STATUS_BADGE: Record<Status, { label: string; color: string; dot: string }> = {
  [Status.DANGER]: { label: "위기", color: "text-red-500", dot: "bg-red-500" },
  [Status.WARNING]: { label: "주의", color: "text-amber-500", dot: "bg-amber-500" },
  [Status.STABLE]: { label: "안정", color: "text-green-500", dot: "bg-green-500" },
};

const AVATAR_COLORS = [
  "bg-purple-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
];

const SERVICES = ["방문요양", "식사배달", "의료지원", "정서지원"];

const RELATIVE_LAST_VISIT = ["2일 전", "5일 전", "3일 전", "오늘 오전", "1일 전", "4일 전"];
const RELATIVE_NEXT_VISIT = [
  "오늘 오후 2시",
  "내일 오전 10시",
  "다음주 월요일",
  "3일 후",
  "내일 오후 3시",
  "다음주 수요일",
];

function RiskBar({ value }: { value: number }) {
  const color = value >= 70 ? "bg-red-500" : value >= 50 ? "bg-amber-500" : "bg-green-500";
  const textColor =
    value >= 70 ? "text-red-500" : value >= 50 ? "text-amber-500" : "text-green-500";

  return (
    <div className="flex items-center gap-2">
      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-sm font-semibold ${textColor}`}>{value}</span>
    </div>
  );
}

function GoalRow({
  percent,
  label,
  count,
  countLabel,
  color,
}: {
  percent: number;
  label: string;
  count: number;
  countLabel: string;
  color: string;
}) {
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="18" stroke="#e5e7eb" strokeWidth="4" fill="none" />
            <circle
              cx="22"
              cy="22"
              r="18"
              stroke="currentColor"
              className={color}
              strokeWidth="4"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-gray-700">
            {percent}%
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <p className="text-xs text-gray-500">{countLabel}</p>
        </div>
      </div>
      <span className={`text-2xl font-bold ${color}`}>{count}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [elders, setElders] = useState<Elder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchElders() {
      try {
        const res = await fetch("/proxy/api/main");
        if (!res.ok) throw new Error(`API 요청 실패: ${res.status}`);
        const json = await res.json();
        setElders(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "데이터를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    }
    fetchElders();
  }, []);

  const filteredElders = elders.filter((elder) =>
    elder.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const pageSize = 4;
  const totalPages = Math.max(1, Math.ceil(filteredElders.length / pageSize));
  const paginatedElders = filteredElders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const dangerCount = elders.filter((e) => e.status === Status.DANGER).length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">케이스 현황 대시보드</h1>
        <p className="text-sm text-gray-500">2026년 5월 22일 금요일</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl font-bold text-gray-900">{elders.length || 34}</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              +2 신규
            </span>
          </div>
          <p className="text-sm text-gray-500">담당 사례 수</p>
          <p className="text-xs text-green-600 mt-2">↑ 지난주 대비 6.3% 증가</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl font-bold text-gray-900">13/15</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              목표 87%
            </span>
          </div>
          <p className="text-sm text-gray-500">이번 주 방문 완료</p>
          <p className="text-xs text-green-600 mt-2">↑ 지난주 대비 8.3% 증가</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl font-bold text-gray-900">{dangerCount || 3}</span>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              즉시 대응
            </span>
          </div>
          <p className="text-sm text-gray-500">위기 사례</p>
          <p className="text-xs text-red-500 mt-2">↓ 지난주 대비 1건 증가</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl font-bold text-gray-900">21</span>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
              +5 이번 주
            </span>
          </div>
          <p className="text-sm text-gray-500">서비스 연계 건수</p>
          <p className="text-xs text-green-600 mt-2">↑ 지난주 대비 31% 증가</p>
        </div>
      </div>

      {/* Weekly Goals & Notices */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="font-bold text-gray-900">주간 목표 달성</h2>
              <p className="text-xs text-gray-500 mt-0.5">이번 주 업무 목표</p>
            </div>
            <button className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium">
              조정
            </button>
          </div>
          <div className="space-y-5">
            <GoalRow
              percent={87}
              label="방문 완료"
              count={13}
              countLabel="13/15건"
              color="text-green-500"
            />
            <GoalRow
              percent={60}
              label="상담 진행"
              count={18}
              countLabel="18/30건"
              color="text-blue-500"
            />
            <GoalRow
              percent={70}
              label="서비스 연계"
              count={21}
              countLabel="21/30건"
              color="text-purple-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="font-bold text-gray-900">특이사항</h2>
              <p className="text-xs text-gray-500 mt-0.5">이번 주 업무 목표</p>
            </div>
            <button className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium">
              조정
            </button>
          </div>
          <div className="space-y-2">
            <div className="border border-red-300 bg-white rounded-lg px-4 py-3 flex items-center gap-2">
              <span className="text-red-500">📌</span>
              <span className="text-sm font-medium text-red-500">
                신철수 어르신 연락 필요
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-1">
            <span className="text-3xl font-bold text-blue-500">18건</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              +3건
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-6">이번 주 상담</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              기록 보기
            </button>
            <button className="bg-blue-500 rounded-lg py-2.5 text-sm font-medium text-white hover:bg-blue-600">
              상담 등록
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-1">
            <span className="text-3xl font-bold text-red-500">3건</span>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              즉시 대응
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-6">위기 사례</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              사례 보기
            </button>
            <button className="bg-red-500 rounded-lg py-2.5 text-sm font-medium text-white hover:bg-red-600">
              긴급 연락
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-1">
            <span className="text-3xl font-bold text-green-500">86.7%</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              +4.2%
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-6">방문 완료율</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              미완료 보기
            </button>
            <button className="bg-green-500 rounded-lg py-2.5 text-sm font-medium text-white hover:bg-green-600">
              방문 등록
            </button>
          </div>
        </div>
      </div>

      {/* Case Table */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="font-bold text-gray-900">담당 목록</h2>
            <p className="text-xs text-gray-500 mt-0.5">최근 활동 기준 정렬</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="사례 검색..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap">
              + 새 사례
            </button>
          </div>
        </div>

        {loading && <p className="text-sm text-gray-500 py-8 text-center">데이터를 불러오는 중...</p>}
        {error && <p className="text-sm text-red-500 py-8 text-center">{error}</p>}

        {!loading && !error && (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 text-xs font-medium text-gray-500">이름</th>
                  <th className="text-left py-3 text-xs font-medium text-gray-500">상태</th>
                  <th className="text-left py-3 text-xs font-medium text-gray-500">마지막 방문</th>
                  <th className="text-left py-3 text-xs font-medium text-gray-500">다음 방문 예정</th>
                  <th className="text-left py-3 text-xs font-medium text-gray-500">위험도</th>
                  <th className="text-left py-3 text-xs font-medium text-gray-500">담당 서비스</th>
                  <th className="py-3"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedElders.map((elder, idx) => {
                  const statusInfo = STATUS_BADGE[elder.status];
                  const avatarColor = AVATAR_COLORS[elder.elder_id % AVATAR_COLORS.length];
                  const maxScore = elder.score.length > 0 ? Math.max(...elder.score) : 0;
                  const lastVisit = RELATIVE_LAST_VISIT[idx % RELATIVE_LAST_VISIT.length];
                  const nextVisit = RELATIVE_NEXT_VISIT[idx % RELATIVE_NEXT_VISIT.length];
                  const service = SERVICES[elder.elder_id % SERVICES.length];
                  const caseId = `#C-2024-${String(elder.elder_id).padStart(3, "0")}`;

                  return (
                    <tr key={elder.elder_id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 ${avatarColor} rounded-full flex items-center justify-center text-white text-sm font-bold`}
                          >
                            {elder.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {elder.name} 어르신
                            </p>
                            <p className="text-xs text-gray-400">{caseId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`text-sm font-medium ${statusInfo.color} flex items-center gap-1.5`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`}></span>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-4 text-sm text-gray-600">{lastVisit}</td>
                      <td className="py-4 text-sm text-gray-600">{nextVisit}</td>
                      <td className="py-4">
                        <RiskBar value={maxScore} />
                      </td>
                      <td className="py-4">
                        <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium">
                          {service}
                        </span>
                      </td>
                      <td className="py-4">
                        <button className="text-xs text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
                          상세
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex justify-between items-center mt-4 pt-4">
              <p className="text-xs text-gray-500">
                전체 {filteredElders.length}개 중 {(currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, filteredElders.length)} 표시
              </p>
              <div className="flex items-center gap-1">
                <button
                  className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  이전
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`w-8 h-8 rounded-lg text-sm font-medium ${currentPage === page ? "bg-blue-500 text-white" : "text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  다음
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
