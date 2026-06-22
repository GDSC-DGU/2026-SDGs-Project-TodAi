"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchElders, type ApiElder } from "@todai/api";

type AppStatus = "완료" | "미설치";
type ActiveStatus = "활성" | "비활성";

interface RosterUser {
  id: number;
  name: string;
  initial: string;
  avatarColor: string;
  age: number;
  phone: string;
  registeredAt: string;
  appStatus: AppStatus;
  activeStatus: ActiveStatus;
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-amber-100 text-amber-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
];

// API에 없는 정보(전화번호·등록일·앱 상태·활성 상태)는 elder_id 기반의 Mock 데이터로 채운다.
function mockPhone(id: number): string {
  const mid = String(1000 + (id * 37) % 9000);
  const last = String(1000 + (id * 53) % 9000);
  return `010-${mid}-${last}`;
}

function mockRegisteredAt(id: number): string {
  const month = ((id * 7) % 12) + 1;
  const day = ((id * 13) % 28) + 1;
  return `2025.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
}

function mockAppStatus(id: number): AppStatus {
  // 비활성/일부 사용자는 미설치로 표기
  return id % 3 === 0 ? "미설치" : "완료";
}

function mockActiveStatus(elder: ApiElder): ActiveStatus {
  // 위험 단계의 어르신은 비활성으로 간주하는 Mock 규칙
  return elder.status === "DANGER" && elder.elder_id % 2 === 0 ? "비활성" : "활성";
}

function elderToRosterUser(elder: ApiElder): RosterUser {
  return {
    id: elder.elder_id,
    name: elder.name,
    initial: elder.name.charAt(0),
    avatarColor: AVATAR_COLORS[elder.elder_id % AVATAR_COLORS.length],
    age: elder.age,
    phone: mockPhone(elder.elder_id),
    registeredAt: mockRegisteredAt(elder.elder_id),
    appStatus: mockAppStatus(elder.elder_id),
    activeStatus: mockActiveStatus(elder),
  };
}

const APP_BADGE: Record<AppStatus, string> = {
  완료: "bg-green-100 text-green-600",
  미설치: "bg-red-100 text-red-500",
};

const ACTIVE_BADGE: Record<ActiveStatus, string> = {
  활성: "text-blue-500",
  비활성: "text-gray-400",
};

export default function RosterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [roster, setRoster] = useState<RosterUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const elders = await fetchElders();
        if (!cancelled) {
          setRoster(elders.map(elderToRosterUser));
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

  const filteredRoster = roster.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-900">서비스 연계 - 담당 명단</h1>
        <p className="text-sm text-gray-500">2026년 5월 22일 금요일</p>
      </div>

      {/* Roster card */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex justify-between items-center px-6 py-5">
          <div>
            <h2 className="font-bold text-gray-900">담당 목록</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              최근 등록 기준 정렬 · 총 {roster.length}명
              {loading && <span className="ml-2 text-blue-500">불러오는 중…</span>}
              {error && <span className="ml-2 text-red-500">{error}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="사용자 검색..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <Link
              href="/dashboard/users/new"
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap"
            >
              + 사용자 등록
            </Link>
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left py-3 pl-6 pr-4 text-sm font-medium text-gray-500">
                사용자 이름
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">전화번호</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">등록일</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">앱 상태</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">상태</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {filteredRoster.map((u) => (
              <tr
                key={u.id}
                className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50"
              >
                <td className="py-4 pl-6 pr-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 ${u.avatarColor} rounded-full flex items-center justify-center text-sm font-bold`}
                    >
                      {u.initial}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.age}세</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-sm text-gray-700">{u.phone}</td>
                <td className="py-4 px-4 text-sm text-gray-700">{u.registeredAt}</td>
                <td className="py-4 px-4">
                  <span
                    className={`inline-block text-xs font-semibold px-4 py-1.5 rounded-full ${APP_BADGE[u.appStatus]}`}
                  >
                    {u.appStatus}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className={`text-sm font-semibold ${ACTIVE_BADGE[u.activeStatus]}`}>
                    {u.activeStatus}
                  </span>
                </td>
                <td className="py-4 px-4 pr-6">
                  <button className="text-sm text-gray-700 border border-gray-200 rounded-lg px-4 py-1.5 hover:bg-gray-50 whitespace-nowrap">
                    재발송
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            전체 {filteredRoster.length}개 중 1-{filteredRoster.length} 표시
          </p>
          <div className="flex items-center gap-1">
            <button
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              이전
            </button>
            {[1, 2, 3].map((page) => (
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
              onClick={() => setCurrentPage((p) => Math.min(3, p + 1))}
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
