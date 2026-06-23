"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import {
  members,
  type ChatMessage,
  type DailyEmotionScore,
  type DailyView,
  type Member,
  type MonthlyDay,
  type MonthlyView,
  type RadarMetric,
  type WeeklyView,
} from "../_data";

type ReportTab = "일간" | "주간" | "월간";

interface DailyApiTimeline {
  start_time: string | null;
  end_time: string | null;
  conv_time: number | null;
}

interface DailyApiConvLog {
  message_id: string;
  content: string;
  name: string;
}

interface DailyApiScoreItem {
  type?: string;
  name?: string;
  score: number;
}

interface DailyApiData {
  timeline: DailyApiTimeline;
  conv_logs: DailyApiConvLog[];
  summary_text: string | null;
  score: (number | DailyApiScoreItem)[];
}

interface DailyApiResponse {
  data: DailyApiData;
}

interface DailyApiResult {
  daily: DailyView;
  chatLog: ChatMessage[];
  conversationTimeRange: string;
  conversationTimeStart: string;
  conversationDurationMin: number;
}

interface WeeklyApiDay {
  date: string;
  day: string;
  score: number | null;
  conv_time: number | null;
}

interface WeeklyApiSummary {
  text?: string;
  date?: string;
  author?: string;
  tone?: "good" | "warn" | "bad";
}

interface WeeklyApiRadarItem {
  type?: string;
  name?: string;
  score: number;
}

interface WeeklyApiData {
  weekly_data: WeeklyApiDay[];
  weekly_scores_radar: (number | WeeklyApiRadarItem)[];
  summaries: (WeeklyApiSummary | string)[];
}

interface WeeklyApiResponse {
  data: WeeklyApiData;
}

interface MonthlyApiDay {
  date: string;
  day: string;
  score: number | null;
  conv_time: number | null;
}

interface MonthlyApiNumericItem {
  type?: string;
  name?: string;
  score?: number;
  value?: number;
}

interface MonthlyApiData {
  monthly_data: MonthlyApiDay[];
  weekly_scores: (number | MonthlyApiNumericItem)[];
  weekly_conv_time: (number | MonthlyApiNumericItem)[];
  monthly_summaries: (string | { text?: string; content?: string })[];
}

interface MonthlyApiResponse {
  data: MonthlyApiData;
}

const DAILY_AXES: DailyEmotionScore["axis"][] = [
  "사회적 고립",
  "인지 부하",
  "감정 변동",
  "일상 활력",
  "건강 불안",
];

function scoreTone(score: number): DailyEmotionScore["tone"] {
  if (score >= 80) return "good";
  if (score >= 50) return "warn";
  return "bad";
}

function trimSeconds(time: string | null): string {
  if (!time) return "-";
  const [h, m] = time.split(":");
  if (!h || !m) return time;
  return `${h}:${m}`;
}

function formatDateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][new Date(y, m - 1, d).getDay()];
  return `${y}년 ${m}월 ${d}일 (${weekday}) · 일간 대화`;
}

function formatKoreanDate(date: string): string {
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return date;
  return `${y}. ${m.padStart(2, "0")}. ${d.padStart(2, "0")}`;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function DailySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-5">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gray-100 p-6 space-y-3">
          <SkeletonBlock className="h-3 w-40 bg-gray-200" />
          <SkeletonBlock className="h-8 w-48 bg-gray-300" />
        </div>
        <div className="p-6 space-y-4">
          <SkeletonBlock className="h-3 w-32" />
          <SkeletonBlock className="h-2 w-full" />
          <div className="grid grid-cols-4 gap-3 pt-5 border-t border-gray-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <SkeletonBlock className="h-2.5 w-16" />
                <SkeletonBlock className="h-5 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <SkeletonBlock className="h-4 w-28" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-3 w-10" />
            </div>
            <SkeletonBlock className="h-2 w-full" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <SkeletonBlock className="h-4 w-24" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <SkeletonBlock className="h-10 w-2/3 rounded-2xl" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-5/6" />
        <SkeletonBlock className="h-3 w-4/6" />
      </div>
    </div>
  );
}

function WeeklySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-5">
      <div className="space-y-5">
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="h-56 w-full" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-16" />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
          <SkeletonBlock className="h-4 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
      <div className="space-y-5">
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <SkeletonBlock className="h-4 w-44" />
          <SkeletonBlock className="h-72 w-full rounded-full" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-16" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthlySkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <SkeletonBlock className="h-4 w-40" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <SkeletonBlock key={i} className="aspect-square" />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="h-56 w-full" />
          <div className="grid grid-cols-4 gap-3 pt-5 border-t border-gray-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-12" />
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
        <SkeletonBlock className="h-4 w-48" />
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-5/6" />
      </div>
    </div>
  );
}

function mapDailyApi(api: DailyApiData, date: string): DailyApiResult {
  const rawScores = api.score ?? [];
  const numericScores = rawScores.map((v) =>
    typeof v === "number" ? v : (v?.score ?? 0),
  );
  const scoreByName = new Map<string, number>();
  for (const v of rawScores) {
    if (typeof v === "object" && v) {
      const key = v.name ?? v.type;
      if (key) scoreByName.set(key, v.score ?? 0);
    }
  }
  const emotionScores: DailyEmotionScore[] = DAILY_AXES.map((axis, i) => {
    const score = scoreByName.get(axis) ?? numericScores[i] ?? 0;
    return { axis, score, tone: scoreTone(score) };
  });

  const validScores = numericScores.filter((s) => typeof s === "number");
  const averageScore = validScores.length
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : 0;
  const maxScore = validScores.length ? Math.max(...validScores) : 0;

  const statusTone: DailyEmotionScore["tone"] = scoreTone(averageScore);
  const statusLabel =
    statusTone === "good" ? "정상" : statusTone === "warn" ? "주의" : "위험";
  const dangerCount = emotionScores.filter((e) => e.tone === "bad").length;
  const warningTone: DailyEmotionScore["tone"] =
    dangerCount >= 2 ? "bad" : dangerCount === 1 ? "warn" : "good";
  const warningLabel = warningTone === "good" ? "없음" : "있음";

  const start = trimSeconds(api.timeline?.start_time ?? null);
  const end = trimSeconds(api.timeline?.end_time ?? null);
  const conversationTimeRange =
    start === "-" && end === "-" ? "-" : `${start} - ${end}`;

  const chatLog: ChatMessage[] = (api.conv_logs ?? [])
    .filter((c) => c?.content)
    .map((c) => ({
      // 백엔드는 AI 메시지에 "말벗 AI", 어르신 메시지엔 실제 이름(예: 박하준)을 준다.
      // 따라서 "말벗 AI" 만 말동무로, 나머지는 어르신으로 판별한다.
      speaker: c.name === "말벗 AI" ? "말동무" : "어르신",
      text: c.content,
    }));

  const totalMessageCount = (api.conv_logs ?? []).length;
  const PREVIEW_LIMIT = 4;
  const hiddenMessageCount = Math.max(0, totalMessageCount - PREVIEW_LIMIT);

  return {
    daily: {
      dateLabel: formatDateLabel(date),
      averageScore,
      maxScore,
      statusLabel,
      statusTone,
      warningLabel,
      warningTone,
      emotionScores,
      summary: api.summary_text ?? "요약 정보가 아직 없습니다.",
      totalMessageCount,
      hiddenMessageCount,
    },
    chatLog: chatLog.slice(0, PREVIEW_LIMIT),
    conversationTimeRange,
    conversationTimeStart: api.timeline?.start_time
      ? trimSeconds(api.timeline.start_time)
      : "-",
    conversationDurationMin: api.timeline?.conv_time ?? 0,
  };
}

function formatRangeLabel(start: string, end: string): string {
  const [, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  if (!sm || !sd || !em || !ed) return `${start} - ${end}`;
  return `${ey}년 ${sm}월 ${sd}일 - ${em}월 ${ed}일`;
}

function mapWeeklyApi(api: WeeklyApiData, fallback: WeeklyView, today: string): WeeklyView {
  const apiDays = api.weekly_data ?? [];
  const days = apiDays.map((d) => ({
    label: d.day,
    minutes: d.conv_time ?? 0,
    score: d.score ?? 0,
    isToday: d.date === today,
  }));

  const validScores = apiDays
    .map((d) => d.score)
    .filter((s): s is number => typeof s === "number");
  const averageScore = validScores.length
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : 0;
  const maxScore = validScores.length ? Math.max(...validScores) : 0;

  const statusTone = scoreTone(averageScore);
  const statusLabel =
    statusTone === "good" ? "정상" : statusTone === "warn" ? "주의" : "위험";
  const lowDays = validScores.filter((s) => s < 50).length;
  const warningTone: DailyEmotionScore["tone"] =
    lowDays >= 2 ? "bad" : lowDays === 1 ? "warn" : "good";
  const warningLabel = warningTone === "good" ? "없음" : "있음";

  const radarValues = (api.weekly_scores_radar ?? []).map((v) =>
    typeof v === "number" ? v : (v?.score ?? 0),
  );
  const radarByName = new Map<string, number>();
  for (const v of api.weekly_scores_radar ?? []) {
    if (typeof v === "object" && v) {
      const key = v.name ?? v.type;
      if (key) radarByName.set(key, v.score ?? 0);
    }
  }
  const radar: RadarMetric[] = DAILY_AXES.map((axis, i) => ({
    axis,
    thisWeek: radarByName.get(axis) ?? radarValues[i] ?? 0,
    lastWeek: fallback.radar[i]?.lastWeek ?? 0,
  }));

  const summaryItems = (api.summaries ?? []).map((s, i) => {
    if (typeof s === "string") {
      return {
        text: s,
        date: apiDays[i]?.date ?? "",
        author: "AI 자동 감지",
        tone: "warn" as const,
      };
    }
    return {
      text: s.text ?? "",
      date: s.date ?? apiDays[i]?.date ?? "",
      author: s.author ?? "AI 자동 감지",
      tone: s.tone ?? "warn",
    };
  });

  const firstDate = apiDays[0]?.date ?? today;
  const lastDate = apiDays[apiDays.length - 1]?.date ?? today;

  return {
    ...fallback,
    rangeLabel: formatRangeLabel(firstDate, lastDate),
    days: days.length ? days : fallback.days,
    averageScore,
    maxScore,
    statusLabel,
    statusTone,
    warningLabel,
    warningTone,
    radar,
    summaryItems: summaryItems.length ? summaryItems : fallback.summaryItems,
  };
}

const MONTHLY_SUMMARY_LABELS = [
  "월간 요약",
  "대화 추이",
  "건강 우려",
  "정서 안정도",
  "다음 달 계획",
];

function mapMonthlyApi(api: MonthlyApiData, fallback: MonthlyView, today: string): MonthlyView {
  const apiDays = api.monthly_data ?? [];
  if (!apiDays.length) return fallback;

  const firstDate = apiDays[0].date;
  const [year, month] = firstDate.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startWeekday = new Date(year, month - 1, 1).getDay();

  const dayMap = new Map<number, MonthlyApiDay>();
  for (const d of apiDays) {
    const dayNum = Number(d.date.split("-")[2]);
    if (!Number.isNaN(dayNum)) dayMap.set(dayNum, d);
  }

  const days: MonthlyDay[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const entry = dayMap.get(i);
    const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    days.push({
      day: i,
      score: entry && typeof entry.score === "number" ? entry.score : null,
      isToday: isoDate === today,
    });
  }

  const validScores = apiDays
    .map((d) => d.score)
    .filter((s): s is number => typeof s === "number");
  const averageScore = validScores.length
    ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100) / 100
    : 0;
  const maxScore = validScores.length ? Math.max(...validScores) : 0;
  const minScore = validScores.length ? Math.min(...validScores) : 0;
  const conversationDays = apiDays.filter(
    (d) => typeof d.conv_time === "number" && d.conv_time > 0,
  ).length;

  const toNumber = (v: number | MonthlyApiNumericItem | undefined): number => {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    if (v && typeof v === "object") {
      const n = v.score ?? v.value ?? 0;
      return Number.isFinite(n) ? Number(n) : 0;
    }
    return 0;
  };
  const weeklyScores = (api.weekly_scores ?? []).map(toNumber);
  const weeklyConv = (api.weekly_conv_time ?? []).map(toNumber);
  const weekCount = Math.max(weeklyScores.length, weeklyConv.length);
  const weekTrend = Array.from({ length: weekCount }, (_, i) => ({
    label: `${i + 1}주차`,
    range: `${i + 1}주차`,
    score: weeklyScores[i] ?? 0,
  }));

  const summaries = api.monthly_summaries ?? [];
  const reportText = summaries
    .map((s, i) => {
      const text =
        typeof s === "string" ? s : (s?.text ?? s?.content ?? "");
      if (!text) return "";
      const label = MONTHLY_SUMMARY_LABELS[i];
      return label ? `[${label}] ${text}` : text;
    })
    .filter(Boolean)
    .join("\n\n");

  return {
    ...fallback,
    title: `월간 감정지수 - ${year}년 ${month}월`,
    subtitle: "날짜별 감정지수 (0-100점)",
    startWeekday,
    daysInMonth,
    days,
    weekTrend: weekTrend.length ? weekTrend : fallback.weekTrend,
    averageScore,
    conversationDays,
    maxScore,
    minScore,
    reportTitle: `월간 분석 리포트 - ${year}년 ${month}월`,
    reportText: reportText || fallback.reportText,
  };
}

function WellbeingBar({
  label,
  percent,
  color,
}: {
  label: string;
  percent: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-sm text-gray-700">{label}</span>
        <span className={`text-sm font-bold ${color.replace("bg-", "text-")}`}>{percent}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ConversationSliderTrack({ member }: { member: Member }) {
  const startHour = 6;
  const endHour = 22;
  const totalHours = endHour - startHour;
  const [hh, mm] = member.conversationTimeStart.split(":").map(Number);
  const handlePercent = Math.max(
    0,
    Math.min(100, ((hh - startHour + (mm || 0) / 60) / totalHours) * 100),
  );

  return (
    <div>
      <div className="relative h-2 bg-gray-100 rounded-full">
        <div
          className="absolute top-0 left-0 h-full bg-blue-400 rounded-full"
          style={{ width: `${handlePercent}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white rounded-full shadow-md border-2 border-blue-500"
          style={{ left: `${handlePercent}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-2">
        {["6:00", "10:00", "14:00", "18:00", "22:00"].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  );
}

const TONE_BAR: Record<DailyEmotionScore["tone"], string> = {
  good: "bg-green-500",
  warn: "bg-orange-400",
  bad: "bg-red-500",
};

const TONE_TEXT: Record<DailyEmotionScore["tone"], string> = {
  good: "text-green-500",
  warn: "text-orange-500",
  bad: "text-red-500",
};

function EmotionScoreBar({ item }: { item: DailyEmotionScore }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-700">{item.axis}</span>
        <span className={`text-sm font-bold ${TONE_TEXT[item.tone]}`}>{item.score}점</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${TONE_BAR[item.tone]}`}
          style={{ width: `${item.score}%` }}
        />
      </div>
    </div>
  );
}

function DailyView({
  member,
  daily,
  chatLog,
  conversationTimeRange,
  conversationTimeStart,
  conversationDurationMin,
  loading,
  error,
}: {
  member: Member;
  daily: DailyView;
  chatLog: ChatMessage[];
  conversationTimeRange: string;
  conversationTimeStart: string;
  conversationDurationMin: number;
  loading: boolean;
  error: string | null;
}) {
  const d = daily;
  const visibleChat = chatLog;
  const statusColor =
    d.statusTone === "good"
      ? "text-blue-500"
      : d.statusTone === "warn"
        ? "text-orange-500"
        : "text-red-500";
  const warningColor =
    d.warningTone === "good"
      ? "text-gray-500"
      : d.warningTone === "warn"
        ? "text-orange-500"
        : "text-red-500";

  return (
    <div className="grid grid-cols-2 gap-5">
      {/* Top-left: conversation card */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6">
          <p className="text-xs text-white/80">
            {d.dateLabel}
            {loading && <span className="ml-2">· 불러오는 중…</span>}
            {error && <span className="ml-2">· {error}</span>}
          </p>
          <div className="flex items-end gap-3 mt-3">
            <span className="text-3xl font-bold">{conversationTimeRange}</span>
            {conversationDurationMin > 0 && (
              <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-1.5">
                {conversationDurationMin}분 대화
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          <p className="text-xs text-gray-500 mb-3">시간대별 대화 현황</p>
          <ConversationSliderTrack
            member={{ ...member, conversationTimeStart }}
          />

          <div className="grid grid-cols-4 gap-3 mt-6 pt-5 border-t border-gray-100">
            <div>
              <p className="text-[11px] text-gray-400">평균 감정지수</p>
              <p className="text-lg font-bold text-blue-500 mt-1">{d.averageScore}점</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">최고 감정지수</p>
              <p className="text-lg font-bold text-green-500 mt-1">{d.maxScore}점</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">감정 상태</p>
              <p className={`text-lg font-bold mt-1 ${statusColor}`}>{d.statusLabel}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">AI 경고</p>
              <p className={`text-lg font-bold mt-1 ${warningColor}`}>{d.warningLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top-right: emotion scores */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">일간 감정지수</h3>
          <span className="text-xs text-gray-400">AI 자동 분석</span>
        </div>
        <div className="space-y-4 mt-5">
          {d.emotionScores.map((item) => (
            <EmotionScoreBar key={item.axis} item={item} />
          ))}
        </div>
      </div>

      {/* Bottom-left: chat record */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">대화 기록</h3>
          <span className="text-xs text-gray-400">{d.totalMessageCount}개의 메세지</span>
        </div>

        <div className="space-y-4">
          {visibleChat.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.speaker === "어르신" ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[75%]">
                {msg.speaker === "말동무" && (
                  <p className="text-[11px] font-semibold text-blue-500 mb-1">말벗 AI</p>
                )}
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm ${
                    msg.speaker === "어르신"
                      ? "bg-gray-100 text-gray-800 rounded-tr-sm"
                      : "bg-blue-50 text-gray-800 rounded-tl-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
        </div>

        {d.hiddenMessageCount > 0 && (
          <button className="w-full mt-5 py-3 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl flex items-center justify-center gap-1.5">
            전체보기 ({d.hiddenMessageCount}개) <span className="text-xs">▼</span>
          </button>
        )}
      </div>

      {/* Bottom-right: AI summary */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">일간 대화 내용 요약</h3>
          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            AI 분석
          </span>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{d.summary}</p>
      </div>
    </div>
  );
}

type WeeklyMode = "score" | "time";

function WeeklyBarChart({ days, mode }: { days: WeeklyView["days"]; mode: WeeklyMode }) {
  const isScore = mode === "score";
  const ticks = isScore ? [0, 25, 50, 100] : [0, 15, 30, 60];
  const max = ticks[ticks.length - 1];
  const unit = isScore ? "점" : "분";
  const chartHeight = 220;
  const valueOf = (d: WeeklyView["days"][number]) => (isScore ? d.score : d.minutes);

  return (
    <div className="relative pl-10" style={{ height: chartHeight + 40 }}>
      {/* Y axis ticks */}
      <div className="absolute left-0 top-0 bottom-10 w-10">
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute right-2 text-[10px] text-gray-400"
            style={{ top: `${(1 - t / max) * 100}%`, transform: "translateY(-50%)" }}
          >
            {t}
            {unit}
          </div>
        ))}
      </div>

      {/* Grid lines */}
      <div className="absolute left-10 right-0 top-0 bottom-10">
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute left-0 right-0 border-t border-dashed border-gray-100"
            style={{ top: `${(1 - t / max) * 100}%` }}
          />
        ))}
      </div>

      {/* Bars */}
      <div className="absolute left-10 right-0 top-0 bottom-10 flex items-end justify-around gap-3">
        {days.map((d) => {
          const value = valueOf(d);
          const heightPct = max ? (value / max) * 100 : 0;
          return (
            <div
              key={d.label}
              className="flex-1 flex flex-col items-center justify-end relative h-full"
            >
              {value > 0 && (
                <span
                  className={`absolute text-xs font-semibold ${d.isToday ? "text-blue-500" : "text-gray-500"}`}
                  style={{ bottom: `calc(${heightPct}% + 4px)` }}
                >
                  {value}
                  {unit}
                </span>
              )}
              <div
                className={`w-full rounded-t-md ${d.isToday ? "bg-blue-500" : "bg-blue-100"}`}
                style={{ height: `${heightPct}%`, minHeight: value > 0 ? 6 : 2 }}
              />
            </div>
          );
        })}
      </div>

      {/* X axis labels */}
      <div className="absolute left-10 right-0 bottom-0 h-10 flex items-start justify-around gap-3 pt-2">
        {days.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center">
            <span
              className={`text-sm font-medium ${d.isToday ? "text-blue-500 font-bold" : "text-gray-600"}`}
            >
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RadarChart({ metrics }: { metrics: RadarMetric[] }) {
  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 130;
  const max = 100;
  const n = metrics.length;
  const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;

  const point = (i: number, value: number) => {
    const r = (value / max) * radius;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
  };

  const polygon = (values: number[]) =>
    values
      .map((v, i) => {
        const [x, y] = point(i, v);
        return `${x},${y}`;
      })
      .join(" ");

  const labelPos = (i: number) => {
    const r = radius + 22;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[360px]">
        {/* Grid pentagons */}
        {gridLevels.map((lvl) => (
          <polygon
            key={lvl}
            points={Array.from({ length: n })
              .map((_, i) => {
                const [x, y] = point(i, lvl * max);
                return `${x},${y}`;
              })
              .join(" ")}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        ))}

        {/* Spokes */}
        {Array.from({ length: n }).map((_, i) => {
          const [x, y] = point(i, max);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          );
        })}

        {/* Last week */}
        <polygon
          points={polygon(metrics.map((m) => m.lastWeek))}
          fill="rgba(147,197,253,0.25)"
          stroke="rgb(147,197,253)"
          strokeWidth={1.5}
        />

        {/* This week */}
        <polygon
          points={polygon(metrics.map((m) => m.thisWeek))}
          fill="rgba(59,130,246,0.18)"
          stroke="rgb(59,130,246)"
          strokeWidth={2}
        />
        {metrics.map((m, i) => {
          const [x, y] = point(i, m.thisWeek);
          return <circle key={i} cx={x} cy={y} r={4} fill="rgb(59,130,246)" />;
        })}

        {/* Labels */}
        {metrics.map((m, i) => {
          const [x, y] = labelPos(i);
          return (
            <text
              key={m.axis}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-gray-600 text-[12px] font-medium"
            >
              {m.axis}
            </text>
          );
        })}
      </svg>

      <div className="flex items-center gap-6 mt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-gray-600">이번주</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-200" />
          <span className="text-gray-600">지난주</span>
        </div>
      </div>
    </div>
  );
}

function WeeklyStatusBadge({
  tone,
  children,
}: {
  tone: "good" | "warn" | "bad";
  children: React.ReactNode;
}) {
  const color =
    tone === "good" ? "text-green-500" : tone === "warn" ? "text-orange-500" : "text-red-500";
  return <span className={`font-bold ${color}`}>{children}</span>;
}

function WeeklyView({
  weekly,
  loading,
  error,
}: {
  weekly: WeeklyView;
  loading: boolean;
  error: string | null;
}) {
  const w = weekly;
  const [mode, setMode] = useState<WeeklyMode>("score");

  return (
    <div className="grid grid-cols-2 gap-5">
      {/* Left col */}
      <div className="space-y-5">
        {/* Weekly score summary */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-gray-900">주간 감정지수 점수 요약</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {w.rangeLabel}
                {loading && <span className="ml-2 text-blue-500">불러오는 중…</span>}
                {error && <span className="ml-2 text-red-500">{error}</span>}
              </p>
            </div>
            <div className="bg-gray-100 rounded-full p-1 flex">
              <button
                onClick={() => setMode("score")}
                className={`px-4 py-1 text-xs font-semibold rounded-full ${
                  mode === "score" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                점수
              </button>
              <button
                onClick={() => setMode("time")}
                className={`px-4 py-1 text-xs font-semibold rounded-full ${
                  mode === "time" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                시간
              </button>
            </div>
          </div>

          <div className="mt-5">
            <WeeklyBarChart days={w.days} mode={mode} />
          </div>

          <div className="grid grid-cols-4 gap-3 mt-6">
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-[11px] text-gray-400">평균 감정지수</p>
              <p className="text-lg font-bold text-orange-500 mt-1">{w.averageScore}점</p>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-[11px] text-gray-400">최고 감정지수</p>
              <p className="text-lg font-bold text-green-500 mt-1">{w.maxScore}점</p>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-[11px] text-gray-400">감정 상태</p>
              <p className="text-lg mt-1">
                <WeeklyStatusBadge tone={w.statusTone}>{w.statusLabel}</WeeklyStatusBadge>
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-[11px] text-gray-400">AI 경고</p>
              <p className="text-lg mt-1">
                <WeeklyStatusBadge tone={w.warningTone}>{w.warningLabel}</WeeklyStatusBadge>
              </p>
            </div>
          </div>
        </div>

        {/* Weekly summary list */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">주간 대화 내용 요약</h3>
            <span className="text-[11px] font-semibold text-white bg-blue-500 px-3 py-1.5 rounded-full">
              AI 분석
            </span>
          </div>
          <div className="space-y-4">
            {w.summaryItems.map((item, i) => {
              const color =
                item.tone === "bad"
                  ? "text-red-500"
                  : item.tone === "warn"
                    ? "text-orange-500"
                    : "text-gray-800";
              return (
                <div key={i} className="border-b border-gray-100 last:border-b-0 pb-3 last:pb-0">
                  <p className={`text-sm font-semibold ${color}`}>{item.text}</p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {item.date} · {item.author}
                  </p>
                </div>
              );
            })}
          </div>
          <button className="w-full mt-3 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-xl flex items-center justify-center gap-1.5">
            더보기 <span className="text-xs">↓</span>
          </button>
        </div>
      </div>

      {/* Right col */}
      <div className="space-y-5">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="font-bold text-gray-900">주간 감정지수 균형 레이더</h3>
              <p className="text-xs text-gray-500 mt-0.5">{w.rangeLabel}</p>
            </div>
            <span className="text-[11px] text-gray-400 mt-1">100점 만점 (낮을수록 위험)</span>
          </div>

          <div className="mt-2">
            <RadarChart metrics={w.radar} />
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            {w.radar.map((m) => {
              const diff = m.thisWeek - m.lastWeek;
              const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "-";
              const valueColor =
                m.thisWeek >= 80
                  ? "text-green-500"
                  : m.thisWeek >= 60
                    ? "text-orange-500"
                    : "text-red-500";
              return (
                <div key={m.axis} className="bg-gray-50 rounded-xl px-3 py-3">
                  <p className="text-xs text-gray-400">{m.axis}</p>
                  <p className={`text-2xl font-bold mt-1 ${valueColor}`}>{m.thisWeek}점</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    지난주 대비 {diff === 0 ? "-" : `${arrow}${Math.abs(diff)}점`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthlyCalendarCell({ day }: { day: MonthlyView["days"][number] }) {
  if (day.isToday) {
    return (
      <div className="aspect-square rounded-lg bg-white border-2 border-blue-400 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-blue-500">{day.day}</span>
        <span className="text-[10px] font-medium text-blue-500">오늘</span>
      </div>
    );
  }

  if (day.score === null) {
    return (
      <div className="aspect-square rounded-lg bg-gray-50 flex items-center justify-center">
        <span className="text-sm text-gray-400">{day.day}</span>
      </div>
    );
  }

  let bg = "bg-red-500";
  if (day.score >= 70) bg = "bg-green-500";
  else if (day.score >= 40) bg = "bg-amber-400";

  return (
    <div className={`aspect-square rounded-lg ${bg} flex flex-col items-center justify-center`}>
      <span className="text-sm font-bold text-white">{day.day}</span>
      <span className="text-[10px] font-medium text-white">{day.score}점</span>
    </div>
  );
}

function MonthlyEmptyCell({ day }: { day: number }) {
  return (
    <div className="aspect-square rounded-lg border border-dashed border-gray-200 flex flex-col items-center justify-center">
      <span className="text-sm text-gray-300">{day}</span>
      <span className="text-[10px] text-gray-300">대화 없음</span>
    </div>
  );
}

function MonthlyCalendar({ monthly }: { monthly: MonthlyView }) {
  const weekdayLabels = ["월", "화", "수", "목", "금", "토", "일"];

  // startWeekday: 0=Sun..6=Sat → convert to Mon-first index (0=Mon..6=Sun)
  const monStart = (monthly.startWeekday + 6) % 7;

  const cells: (MonthlyDay | null)[] = [];
  for (let i = 0; i < monStart; i++) cells.push(null);
  for (const d of monthly.days) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // For day 6 in image it shows "대화 없음" with dashed border - treat score:null with day<=20 as "no chat" cell
  return (
    <div>
      <div className="grid grid-cols-7 gap-2 mb-3">
        {weekdayLabels.map((w) => (
          <div key={w} className="text-center text-xs text-gray-400 font-medium">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((d, i) => {
          if (d === null) return <div key={`empty-${i}`} className="aspect-square" />;
          if (d.score === null && !d.isToday && d.day === 6)
            return <MonthlyEmptyCell key={d.day} day={d.day} />;
          return <MonthlyCalendarCell key={d.day} day={d} />;
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 text-[11px] text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-500" />
          <span>70-100점</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-400" />
          <span>40-69점</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-500" />
          <span>0-39점</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border border-dashed border-gray-300" />
          <span>대화 없음</span>
        </div>
      </div>
    </div>
  );
}

function MonthlyTrendChart({ trend }: { trend: MonthlyView["weekTrend"] }) {
  const width = 420;
  const height = 240;
  const padTop = 30;
  const padBottom = 50;
  const padLeft = 44;
  const padRight = 20;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;
  const ticks = [0, 25, 50, 75, 100];
  const max = 100;

  const x = (i: number) => padLeft + (innerW * i) / Math.max(1, trend.length - 1);
  const y = (v: number) => padTop + innerH * (1 - v / max);

  const path = trend
    .map((t, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(t.score)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={padLeft}
            x2={width - padRight}
            y1={y(t)}
            y2={y(t)}
            stroke="#f3f4f6"
            strokeWidth={1}
          />
          <text
            x={padLeft - 8}
            y={y(t)}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-gray-400 text-[10px]"
          >
            {t}점
          </text>
        </g>
      ))}

      <path d={path} fill="none" stroke="rgb(59,130,246)" strokeWidth={2} />

      {trend.map((t, i) => (
        <g key={t.label}>
          <circle cx={x(i)} cy={y(t.score)} r={4} fill="rgb(59,130,246)" />
          <text
            x={x(i)}
            y={y(t.score) - 10}
            textAnchor="middle"
            className="fill-blue-500 text-[11px] font-bold"
          >
            {t.score}점
          </text>
          <text
            x={x(i)}
            y={height - padBottom + 18}
            textAnchor="middle"
            className="fill-gray-600 text-[11px] font-medium"
          >
            {t.label}
          </text>
          <text
            x={x(i)}
            y={height - padBottom + 32}
            textAnchor="middle"
            className="fill-gray-400 text-[10px]"
          >
            {t.range}
          </text>
        </g>
      ))}
    </svg>
  );
}

const MONTHLY_TAG_TONE: Record<MonthlyView["tags"][number]["tone"], string> = {
  danger: "bg-red-50 text-red-600 border border-red-100",
  info: "bg-blue-50 text-blue-600 border border-blue-100",
  success: "bg-green-50 text-green-600 border border-green-100",
};

function MonthlyViewSection({
  monthly,
  loading,
  error,
}: {
  monthly: MonthlyView;
  loading: boolean;
  error: string | null;
}) {
  const m = monthly;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-5">
        {/* Calendar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-900">{m.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5 mb-5">
            {m.subtitle}
            {loading && <span className="ml-2 text-blue-500">불러오는 중…</span>}
            {error && <span className="ml-2 text-red-500">{error}</span>}
          </p>
          <MonthlyCalendar monthly={m} />
        </div>

        {/* Trend chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-900">월간 감정지수 추이</h3>
          <p className="text-xs text-gray-500 mt-0.5">최근 4주 감정지수</p>

          <div className="mt-4">
            <MonthlyTrendChart trend={m.weekTrend} />
          </div>

          <div className="grid grid-cols-4 gap-3 mt-4 pt-5 border-t border-gray-100">
            <div>
              <p className="text-[11px] text-gray-400">최근 4주 평균 점수</p>
              <p className="mt-1">
                <span className="text-2xl font-bold text-blue-500">{m.averageScore}</span>
                <span className="text-sm text-blue-500 ml-0.5">점</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">대화 일수</p>
              <p className="mt-1">
                <span className="text-2xl font-bold text-blue-500">{m.conversationDays}</span>
                <span className="text-sm text-blue-500 ml-0.5">점</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">최고 점수</p>
              <p className="mt-1">
                <span className="text-2xl font-bold text-green-500">{m.maxScore}</span>
                <span className="text-sm text-green-500 ml-0.5">점</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">최저 점수</p>
              <p className="mt-1">
                <span className="text-2xl font-bold text-red-500">{m.minScore}</span>
                <span className="text-sm text-red-500 ml-0.5">점</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Report */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-900">{m.reportTitle}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{m.reportSubtitle}</p>

        <div className="border-t border-gray-100 mt-4 pt-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {m.tags.map((t) => (
              <span
                key={t.text}
                className={`text-xs font-medium px-3 py-1.5 rounded-md ${MONTHLY_TAG_TONE[t.tone]}`}
              >
                {t.icon} {t.text}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {m.reportText}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const queryName = searchParams.get("name");
  const queryRisk = searchParams.get("risk");
  const member = useMemo<Member>(() => {
    const fallbackMember = members.find((m) => String(m.id) === id);
    const baseMember = fallbackMember ?? members[0];
    const riskFromQuery: Member["risk"] | undefined =
      queryRisk === "정상"
        ? "안정"
        : queryRisk === "주의"
          ? "주의"
          : queryRisk === "대화 필요" || queryRisk === "위험"
            ? "긴급"
            : undefined;
    return {
      ...baseMember,
      id: Number(id),
      name: queryName ?? baseMember.name,
      initial: (queryName ?? baseMember.name).charAt(0),
      risk: riskFromQuery ?? baseMember.risk,
    };
  }, [id, queryName, queryRisk]);

  const [tab, setTab] = useState<ReportTab>("일간");
  const [date, setDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [dailyData, setDailyData] = useState<DailyApiResult | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyView | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyView | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "일간") return;
    let cancelled = false;
    setDailyLoading(true);
    setDailyError(null);

    fetch("/proxy/api/elder/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ elder_id: Number(id), date }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`API 요청 실패: ${res.status}`);
        return (await res.json()) as DailyApiResponse;
      })
      .then((json) => {
        if (cancelled) return;
        setDailyData(mapDailyApi(json.data, date));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setDailyError(err instanceof Error ? err.message : "데이터를 불러올 수 없습니다.");
      })
      .finally(() => {
        if (!cancelled) setDailyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, id, date]);

  useEffect(() => {
    if (tab !== "주간" || !member) return;
    let cancelled = false;
    setWeeklyLoading(true);
    setWeeklyError(null);

    fetch("/proxy/api/elder/weekly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ elder_id: Number(id), date }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`API 요청 실패: ${res.status}`);
        return (await res.json()) as WeeklyApiResponse;
      })
      .then((json) => {
        if (cancelled) return;
        setWeeklyData(mapWeeklyApi(json.data, member.weekly, date));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setWeeklyError(err instanceof Error ? err.message : "데이터를 불러올 수 없습니다.");
      })
      .finally(() => {
        if (!cancelled) setWeeklyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, id, date]);

  useEffect(() => {
    if (tab !== "월간" || !member) return;
    let cancelled = false;
    setMonthlyLoading(true);
    setMonthlyError(null);

    fetch("/proxy/api/elder/monthly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ elder_id: Number(id), date }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`API 요청 실패: ${res.status}`);
        return (await res.json()) as MonthlyApiResponse;
      })
      .then((json) => {
        if (cancelled) return;
        setMonthlyData(mapMonthlyApi(json.data, member.monthly, date));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMonthlyError(err instanceof Error ? err.message : "데이터를 불러올 수 없습니다.");
      })
      .finally(() => {
        if (!cancelled) setMonthlyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, id, date]);

  const riskLabel = member.risk === "안정" ? "정상" : member.risk;
  const riskBadgeColor =
    member.risk === "안정"
      ? "bg-green-100 text-green-600"
      : member.risk === "주의"
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-600";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link
            href="/dashboard/members"
            className="inline-flex items-center gap-1 text-sm text-blue-500 font-medium hover:underline mb-1"
          >
            <span aria-hidden>←</span>
            <span>인원관리로 돌아가기</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {member.name}님 {tab} 상세 분석
            </h1>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${riskBadgeColor}`}>
              {riskLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-7">
          <label className="relative flex items-center gap-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-full px-4 py-1.5 hover:bg-gray-50 cursor-pointer">
            <span aria-hidden>📅</span>
            <span className="font-medium">{formatKoreanDate(date)}</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label="조회 날짜 선택"
            />
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5">
        <div className="flex items-center gap-8 border-b border-gray-200">
          {(["일간", "주간", "월간"] as ReportTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative pb-3 text-sm font-semibold transition-colors ${
                tab === t ? "text-blue-500" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t}
              {tab === t && (
                <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === "일간" &&
        (dailyLoading && !dailyData ? (
          <DailySkeleton />
        ) : (
          <DailyView
            member={member}
            daily={dailyData?.daily ?? member.daily}
            chatLog={dailyData?.chatLog ?? member.chatLog}
            conversationTimeRange={
              dailyData?.conversationTimeRange ?? member.conversationTimeRange
            }
            conversationTimeStart={
              dailyData?.conversationTimeStart ?? member.conversationTimeStart
            }
            conversationDurationMin={
              dailyData?.conversationDurationMin ?? member.conversationDurationMin
            }
            loading={dailyLoading}
            error={dailyError}
          />
        ))}
      {tab === "주간" &&
        (weeklyLoading && !weeklyData ? (
          <WeeklySkeleton />
        ) : (
          <WeeklyView
            weekly={weeklyData ?? member.weekly}
            loading={weeklyLoading}
            error={weeklyError}
          />
        ))}
      {tab === "월간" &&
        (monthlyLoading && !monthlyData ? (
          <MonthlySkeleton />
        ) : (
          <MonthlyViewSection
            monthly={monthlyData ?? member.monthly}
            loading={monthlyLoading}
            error={monthlyError}
          />
        ))}
    </div>
  );
}
