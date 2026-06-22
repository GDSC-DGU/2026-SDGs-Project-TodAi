"""어르신의 누적 분석 지표를 읽어와 말벗 대답의 컨텍스트로 만든다 (피드백 루프).

slow track 이 쌓아둔 analysis_result / analysis_metric (PostgreSQL) 을 되읽어, 대답 LLM 의
시스템 프롬프트에 '이 어르신의 최근 상태'를 주입한다. 그러면 대화가 지표에 따라 적응한다.

읽기 전용. 환경변수 PG_* 로 접속 정보 조정 (기본 todai/todai @ localhost).
"""
import os

import psycopg2

PG = dict(
    host=os.getenv("PGHOST", "localhost"),
    port=int(os.getenv("PGPORT", "5432")),
    dbname=os.getenv("PGDATABASE", "todai"),
    user=os.getenv("PGUSER", "todai"),
    password=os.getenv("PGPASSWORD_DB", os.getenv("PGPASSWORD", "todai")),
)

# 지표 enum -> 한국어 라벨 (0~100, 높을수록 건강)
METRIC_KO = {
    "SOCIAL_ISOLATION": "사회적 고립",
    "HEALTH_ANXIETY": "건강 불안",
    "DAILY_VITALITY": "일상 활력",
    "EMOTIONAL_VARIATION": "감정 변동",
    "COGNITIVE_DECLINE": "인지 부하",
}


def fetch_elder_context(elder_id) -> dict | None:
    """elder_id 의 최신 성공 분석 1건 + 지표 + 이름/위험단계. 없으면 None."""
    if not elder_id:
        return None
    try:
        conn = psycopg2.connect(**PG, connect_timeout=3)
    except Exception:
        return None
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT ar.id, ar.summary_text, ar.overall_score, e.name, e.status
                FROM analysis_result ar JOIN elder e ON e.id = ar.elder_id
                WHERE ar.elder_id = %s AND ar.analysis_status = 'SUCCESS'
                ORDER BY ar.id DESC LIMIT 1
                """,
                (int(elder_id),),
            )
            row = cur.fetchone()
            if not row:
                return None
            result_id, summary, overall, name, status = row
            cur.execute(
                "SELECT metric_type, metric_score FROM analysis_metric WHERE analysis_result_id = %s",
                (result_id,),
            )
            metrics = {m: float(s) for m, s in cur.fetchall() if s is not None}
        return {
            "name": name,
            "status": status,
            "summary": summary,
            "overall": float(overall) if overall is not None else None,
            "metrics": metrics,
        }
    finally:
        conn.close()


def context_prompt(elder_id) -> str:
    """LLM 시스템 프롬프트에 덧붙일 '어르신 최근 상태' 블록. 데이터 없으면 빈 문자열."""
    ctx = fetch_elder_context(elder_id)
    if not ctx:
        return ""
    lines = ["\n[이 어르신의 최근 상태 — 대화에 자연스럽게 반영하되, 점수/진단을 직접 입에 올리지 마세요]"]
    lines.append(f"- 위험단계: {ctx['status']}")
    if ctx.get("summary"):
        lines.append(f"- 최근 분석 요약: {ctx['summary']}")
    if ctx["metrics"]:
        scored = ", ".join(
            f"{METRIC_KO.get(k, k)} {round(v)}" for k, v in ctx["metrics"].items()
        )
        lines.append(f"- 지표(0~100, 높을수록 건강): {scored}")
        # 낮은(취약한) 지표를 골라 대응 가이드 제시
        weak = sorted(ctx["metrics"].items(), key=lambda kv: kv[1])[:2]
        hint = " / ".join(METRIC_KO.get(k, k) for k, v in weak if v < 60)
        if hint:
            lines.append(f"- 특히 '{hint}'(이)가 낮으니 더 따뜻하게 공감하고, 무리하지 않는 선에서 일상·교류를 부드럽게 권하세요.")
    return "\n".join(lines)


if __name__ == "__main__":
    import sys
    eid = sys.argv[1] if len(sys.argv) > 1 else os.getenv("DEMO_ELDER_ID", "5")
    print(context_prompt(eid))
