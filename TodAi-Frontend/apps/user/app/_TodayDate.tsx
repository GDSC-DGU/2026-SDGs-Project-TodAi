"use client";

import { useEffect, useState } from "react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 날짜는 클라이언트에서 계산해 SSR/CSR 불일치를 피한다.
export default function TodayDate() {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const d = new Date();
    setLabel(
      `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`,
    );
  }, []);

  return <p className="text-lg text-[var(--muted)]">{label || " "}</p>;
}
