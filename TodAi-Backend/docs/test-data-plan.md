# 테스트 데이터 계획 리포트

## 1. 목적

- 프론트 연동 테스트를 위해 배포 서버 DB에 어떤 데이터를 넣어야 하는지 현재 구현 코드 기준으로 정리한다.
- 이번 단계에서는 `INSERT SQL`을 작성하지 않고, 필요한 데이터 범위와 테스트 시나리오만 확정한다.
- 분석 기준 코드는 현재 구현된 서비스/리포지토리/엔티티다.
  - `src/main/java/com/solchall/todai/api/main/service/MainServiceImpl.java`
  - `src/main/java/com/solchall/todai/api/elder/service/ElderDailyAnalysisServiceImpl.java`
  - `src/main/java/com/solchall/todai/api/elder/service/ElderWeeklyAnalysisServiceImpl.java`
  - `src/main/java/com/solchall/todai/api/elder/service/ElderMonthlyAnalysisServiceImpl.java`
  - `src/main/java/com/solchall/todai/domain/*/entity/*.java`
- 현재 PostgreSQL 스키마는 JPA 엔티티 기반으로 관리되고 있고, `src/main/resources/schema-postgresql.sql`에서는 `elder.status` 기본값 보정과 `conversation_session.source_type` 제거만 추가 반영되어 있다.

## 2. 현재 구현 API별 필요 데이터

### 2.1 GET /api/main

- 필요한 테이블
  - `elder`
- 필요한 컬럼
  - `elder.id`
  - `elder.name`
  - `elder.age`
  - `elder.gender`
  - `elder.status`
- 확인해야 할 응답 요소
  - `data` 배열이 `elder.id ASC` 순서로 내려오는지
  - `elder_id`, `name`, `age`, `gender`, `status` 값이 정상인지
  - 현재 구현상 `weekly_conv`는 항상 `0`
  - 현재 구현상 `score`는 항상 빈 배열 `[]`
- 필요한 테스트 데이터
  - 최소 `elder` 3명
  - 다른 테이블 데이터는 현재 `GET /api/main` 응답에 영향을 주지 않음
- 주의
  - 메인 API는 아직 `conversation_session`, `analysis_result`, `analysis_metric`을 조회하지 않는다.
  - 프론트가 메인 화면에서 주간 대화 수나 점수 카드를 기대하더라도, 현재 백엔드는 항상 `0`과 `[]`를 반환한다.

### 2.2 POST /api/elder/daily

- 필요한 테이블
  - `elder`
  - `conversation_session`
  - `conversation_message`
  - `analysis_result`
  - `analysis_metric`
- 필요한 컬럼
  - `elder`
    - `id`, `name`
  - `conversation_session`
    - `id`, `elder_id`, `started_at`, `ended_at`, `duration_seconds`, `session_status`, `summary_text`
  - `conversation_message`
    - `id`, `conversation_session_id`, `speaker_type`, `speaker_name`, `content`, `message_order`
  - `analysis_result`
    - `id`, `conversation_session_id`, `analysis_status`, `summary_text`
  - `analysis_metric`
    - `analysis_result_id`, `metric_type`, `metric_score`
- 확인해야 할 응답 요소
  - `timeline.start_time`, `timeline.end_time`, `timeline.conv_time`
  - `conv_logs[]` 정렬이 `message_order ASC`인지
  - `conv_logs[].name`이 `speaker_name` 없을 때 `ELDER -> 어르신 이름`, `AI -> 말벗 AI`로 내려오는지
  - `summary_text`가 `analysis_result.summary_text` 우선인지
  - `score[]`가 아래 순서로 내려오는지
    - `SOCIAL_ISOLATION`
    - `COGNITIVE_DECLINE`
    - `EMOTIONAL_VARIATION`
    - `DAILY_VITALITY`
    - `HEALTH_ANXIETY`
- 필요한 테스트 데이터
  - 정상 케이스
    - 해당 날짜에 `COMPLETED` 세션 1건 이상
    - 선택되는 세션에 `conversation_message` 3~5건
    - 선택되는 세션에 `analysis_result` 1건 (`SUCCESS` 또는 `PARTIAL`)
    - 해당 `analysis_result`에 `analysis_metric` 5종
  - 부분 케이스
    - 세션은 있지만 `analysis_result` 없음
    - `analysis_result`는 있지만 `analysis_metric` 없음
    - `analysis_result.summary_text = null`이라서 `conversation_session.summary_text`로 fallback 되는 케이스
    - `analysis_result.summary_text = ''` 또는 공백이라서 빈 문자열이 그대로 내려오는 케이스
- 세션이 없는 날짜 응답 확인 케이스
  - `200 OK`
  - `timeline` 객체는 유지되지만 내부 값은 모두 `null`
  - `conv_logs = []`
  - `summary_text = null`
  - `score = []`
- 추가 확인 포인트
  - 같은 날짜에 여러 세션이 있으면 `started_at`이 가장 늦은 `COMPLETED` 세션을 선택한다.
  - 같은 날짜에 `COMPLETED`가 하나도 없으면 가장 늦은 아무 상태 세션을 fallback으로 선택한다.
  - 따라서 일간 API fallback 동작 검증을 위해 `IN_PROGRESS` 1건을 선택적으로 넣는 것이 유효하다.

### 2.3 POST /api/elder/weekly

- 필요한 테이블
  - `elder`
  - `conversation_session`
  - `analysis_result`
  - `analysis_metric`
- 필요한 컬럼
  - `conversation_session`
    - `elder_id`, `started_at`, `ended_at`, `duration_seconds`, `session_status`
  - `analysis_result`
    - `conversation_session_id`, `analysis_status`, `overall_score`, `summary_text`
  - `analysis_metric`
    - `analysis_result_id`, `metric_type`, `metric_score`
- 확인해야 할 응답 요소
  - `weekly_data`가 항상 7개인지
  - 각 날짜의 `day`가 한글 요일(`월/화/수/목/금/토/일`)로 맞는지
  - `weekly_data[].score`가 같은 날짜 `overall_score` 평균인지
  - `weekly_data[].conv_time`이 같은 날짜 `duration_seconds` 합계를 분 단위로 내리는지
  - `weekly_scores_radar`가 5개 고정 순서인지
  - `summaries[]`가 `analysis_result.summary_text`가 있는 결과만 포함하는지
- 필요한 테스트 데이터
  - 주간 7일 안에 데이터가 있는 날짜와 없는 날짜를 섞어서 배치
  - 하루에 세션 2건 이상인 날짜 1일 이상 포함
  - `duration_seconds = null`인 세션 1건 포함해서 `ended_at - started_at` fallback 계산 확인
  - `FAILED` 세션 또는 `FAILED` 분석 결과는 집계에서 제외되는지 확인
- 최근 7일 계산 기준
  - 요청 `date` 포함 최근 7일
  - 기준일이 `2026-01-30`이면 조회 범위는 `2026-01-24 00:00:00` 이상 `2026-01-31 00:00:00` 미만
  - 집계 대상 세션 상태는 `COMPLETED`만 포함
  - 집계 대상 분석 상태는 `SUCCESS`, `PARTIAL`만 포함
- 요일 표시 확인 케이스
  - `2026-01-24 ~ 2026-01-30`의 기대 요일
    - `01-24 토`
    - `01-25 일`
    - `01-26 월`
    - `01-27 화`
    - `01-28 수`
    - `01-29 목`
    - `01-30 금`
- 주간 레이더 평균 확인 케이스
  - 같은 `metric_type`이 여러 세션에 걸쳐 존재하도록 설계
  - 일부 `metric_type`은 의도적으로 누락해서 `score = null` 케이스도 확인

### 2.4 POST /api/elder/weekly/detail

- 필요한 테이블
  - `elder`
  - `conversation_session`
  - `analysis_result`
  - `analysis_metric`
- 필요한 컬럼
  - `conversation_session.elder_id`, `started_at`, `session_status`
  - `analysis_result.conversation_session_id`, `analysis_status`
  - `analysis_metric.analysis_result_id`, `metric_type`, `metric_score`
- 확인해야 할 응답 요소
  - `guides`가 5개 고정인지
  - `type` 매핑이 아래와 같은지
    - `0 -> SOCIAL_ISOLATION`
    - `1 -> COGNITIVE_DECLINE`
    - `2 -> EMOTIONAL_VARIATION`
    - `3 -> DAILY_VITALITY`
    - `4 -> HEALTH_ANXIETY`
  - `status`가 `NO_DATA`, `LOW`, `MEDIUM`, `HIGH` 중 하나인지
- 필요한 테스트 데이터
  - 최근 7일 내 metric 평균으로 아래 상태를 모두 만들 수 있게 설계
    - `NO_DATA`
    - `LOW` (`< 40`)
    - `MEDIUM` (`40 이상 70 미만`)
    - `HIGH` (`70 이상`)
- 지표별 guide 문구가 달라지는 점수 구간 확인 케이스
  - 현재 구현은 DB에서 guide 문구를 조회하지 않는다.
  - 실제 응답은 문구가 아니라 `status`만 반환한다.
  - 따라서 프론트 연동 기준으로는 `status` 값에 따라 UI 문구가 달라지는지 확인해야 한다.
  - 테스트 데이터는 최소 1명의 최근 7일 평균이 아래처럼 나오도록 배치하는 것이 좋다.
    - `SOCIAL_ISOLATION -> LOW`
    - `COGNITIVE_DECLINE -> MEDIUM`
    - `EMOTIONAL_VARIATION -> HIGH`
    - `DAILY_VITALITY -> NO_DATA`
    - `HEALTH_ANXIETY -> HIGH`

### 2.5 POST /api/elder/monthly

- 필요한 테이블
  - `elder`
  - `conversation_session`
  - `analysis_result`
  - `analysis_metric`
- 필요한 컬럼
  - `conversation_session`
    - `elder_id`, `started_at`, `ended_at`, `duration_seconds`, `session_status`
  - `analysis_result`
    - `conversation_session_id`, `analysis_status`, `overall_score`, `summary_text`
  - `analysis_metric`
    - `analysis_result_id`, `metric_type`, `metric_score`
- 확인해야 할 응답 요소
  - `monthly_data`가 해당 월 전체 날짜 수만큼 내려오는지
  - `weekly_scores`가 월을 `7일 단위 고정 버킷`으로 잘라 계산되는지
  - `weekly_conv_time`도 같은 주차 규칙으로 계산되는지
  - `monthly_summaries`가 항상 4개인지
  - `monthly_summaries.type/title/content`가 고정 규칙대로 나오는지
- 필요한 테스트 데이터
  - 월초/월중/월말에 분산된 `COMPLETED` 세션
  - 일부 날짜는 세션 없음
  - 일부 주차는 score 없음, conv_time만 있음 또는 둘 다 없음
  - `summary_text`가 3개 이상 존재해서 `SUMMARY` 문구가 이어붙여지는 케이스
  - `HEALTH_ANXIETY`, `EMOTIONAL_VARIATION` 평균에 따라 월간 요약 문구가 달라지는 케이스
  - 월 후반 대화 시간이 더 많아지는 데이터로 `CONVERSATION_TREND` 문구 확인
- 월 전체 날짜 데이터 확인 케이스
  - 기준일 `2026-01-30`이면 `2026-01-01 ~ 2026-01-31` 총 31개
  - 세션이 없는 날짜도 모두 `score = null`, `conv_time = 0` 형태로 포함
- 주차별 평균 점수/대화 시간 확인 케이스
  - 현재 구현의 주차 계산은 달력 주차가 아니라 `7일 고정 버킷`이다.
    - 1주차: `01-01 ~ 01-07`
    - 2주차: `01-08 ~ 01-14`
    - 3주차: `01-15 ~ 01-21`
    - 4주차: `01-22 ~ 01-28`
    - 5주차: `01-29 ~ 01-31`
- 월간 요약 확인 케이스
  - `SUMMARY`
    - `analysis_result.summary_text`가 비어 있지 않은 항목 중 시간순 앞 3개를 공백으로 이어 붙임
  - `CONVERSATION_TREND`
    - `2026-01` 기준 pivot은 `2026-01-16`
    - `01-01 ~ 01-16` vs `01-17 ~ 01-31` 총 대화 시간 비교
  - `HEALTH_ANXIETY`
    - 월간 `HEALTH_ANXIETY` 평균점수 기반 고정 문구
  - `EMOTIONAL_STABILITY`
    - 월간 `EMOTIONAL_VARIATION` 평균점수 기반 고정 문구

## 3. 테스트 기준 날짜

- 기준 날짜: `2026-01-30`
- 주간 API 확인 범위: `2026-01-24 ~ 2026-01-30`
- 월간 API 확인 범위: `2026-01-01 ~ 2026-01-31`
- 권장 원칙
  - 모든 테스트 데이터의 핵심 세션은 `2026-01`에 배치
  - 프론트가 하루/주/월 전환을 쉽게 확인할 수 있게 월초, 월중, 월말에 분산
  - 일간 API용 대표 상세 세션은 `elder_id=1`, `2026-01-30`로 고정

## 4. 어르신별 테스트 시나리오

### 4.1 elder_id=1 정이안

- 정상 데이터 풍부 케이스
- `2026-01-24 ~ 2026-01-30`에 여러 `COMPLETED` 세션 존재
- `2026-01-30`에는 하루 2개 이상의 `COMPLETED` 세션 존재
- 대표 일간 조회 대상으로 선택될 `2026-01-30` 마지막 `COMPLETED` 세션에 `conversation_message` 3~5개 존재
- 대표 세션과 최근 7일 세션들에는 `analysis_result` 존재
- 최근 7일 핵심 세션들에는 `analysis_metric` 5개 지표 모두 존재
- 월초/월중/월말에 분석 요약이 분산되어 월간 요약/주차별 집계가 모두 값 있는 응답이 되도록 설계
- 선택 옵션
  - `2026-01-30` 늦은 시간에 `IN_PROGRESS` 세션 1건을 추가하면, 일간 API가 최신 세션이 아니라 최신 `COMPLETED` 세션을 우선 선택하는지 검증 가능
- 기대 목적
  - 일간/주간/월간 API 전부 값이 채워진 정상 응답 검증

### 4.2 elder_id=2 안건호

- 부분 데이터 케이스
- 최근 7일 중 일부 날짜만 세션 존재
- `analysis_result.summary_text`
  - 한 세션은 `null`
  - 한 세션은 빈 문자열 또는 공백
- 일부 `analysis_metric`만 존재
- 일부 지표는 최근 7일 평균 계산 대상이 아예 없어 `NO_DATA`가 되게 설계
- `conversation_message`는 넣지 않거나 일부만 넣어서 `conv_logs = []`도 확인 가능
- 기대 목적
  - 빈 배열/null 처리
  - 요약 fallback
  - metric 누락
  - weekly/detail의 `LOW/MEDIUM/HIGH/NO_DATA` 혼합 상태 검증

### 4.3 elder_id=3 엄성현

- 빈 데이터 또는 분석 부족 케이스
- `elder`는 존재하지만 `conversation_session` 없음
- 기대 목적
  - `daily`는 `200 + null timeline + 빈 배열`
  - `weekly`는 `200 + 7일 빈 데이터 + 빈 summaries + radar null`
  - `weekly/detail`은 5개 모두 `NO_DATA`
  - `monthly`는 `200 + 31일 빈 데이터 + 5주 빈 집계 + 기본 월간 요약 4종`

## 5. 테이블별 삽입 데이터 계획

### 5.1 elder

- 기존 데이터가 있다면 재사용 여부보다 `id=1,2,3`을 정확히 맞출 수 있는지 먼저 확인해야 한다.
- 배포 서버 DB에 기존 데이터가 섞여 있으면 아래 문제가 생긴다.
  - `GET /api/main`에 불필요한 어르신이 함께 노출됨
  - `elder_id=1,2,3` 보장이 깨질 수 있음
- 권장안
  - 테스트용 DB 또는 테스트용 스키마에서 3명만 명확히 보장
  - 또는 기존 데이터 정리 후 아래 3명 고정

| elder_id | 이름 | 상태 | 비고 |
| --- | --- | --- | --- |
| 1 | 정이안 | STABLE | 정상 데이터 풍부 케이스 |
| 2 | 안건호 | WARNING | 부분 데이터 케이스 |
| 3 | 엄성현 | NO_DATA | 빈 데이터 케이스 |

### 5.2 conversation_session

- `session_key`는 중복되지 않게 `E{elderId}-YYYYMMDD-HHMM-{seq}` 패턴 권장
- 현재 API가 직접 읽는 컬럼은 `elder_id`, `started_at`, `ended_at`, `duration_seconds`, `session_status`, `summary_text`다.
- `turn_count`는 현재 응답에 직접 쓰이지 않지만 현실적인 seed 데이터로 채우는 편이 낫다.
- `source_type`은 현재 스키마에서 제거되었으므로 다시 넣지 않는다.
- `session_status`
  - 기본은 `COMPLETED`
  - 제외 동작 검증용으로 `IN_PROGRESS` 또는 `FAILED`를 최소 1건 넣는 것을 권장

권장 세션 배치:

| session_key | elder_id | started_at | ended_at | duration_seconds | turn_count | session_status | summary_text | 목적 |
| --- | --- | --- | --- | ---: | ---: | --- | --- | --- |
| E1-20260102-0900-01 | 1 | 2026-01-02 09:00 | 2026-01-02 09:12 | 720 | 6 | COMPLETED | 월초 안부 대화 | 월간 1주차 |
| E1-20260106-1400-01 | 1 | 2026-01-06 14:00 | 2026-01-06 14:15 | 900 | 8 | COMPLETED | 식사와 수면 대화 | 월간 1주차 |
| E1-20260110-1000-01 | 1 | 2026-01-10 10:00 | 2026-01-10 10:20 | 1200 | 10 | COMPLETED | 건강 상태 점검 대화 | 월간 2주차 |
| E1-20260116-1500-01 | 1 | 2026-01-16 15:00 | 2026-01-16 15:13 | 780 | 7 | COMPLETED | 주중 일상 대화 | 월간 전반부 끝 |
| E1-20260124-1000-01 | 1 | 2026-01-24 10:00 | 2026-01-24 10:15 | 900 | 9 | COMPLETED | 주말 계획 대화 | 주간 시작 |
| E1-20260126-0930-01 | 1 | 2026-01-26 09:30 | 2026-01-26 09:55 | 1500 | 12 | COMPLETED | 아침 산책 대화 | 주간 중간 |
| E1-20260128-1900-01 | 1 | 2026-01-28 19:00 | 2026-01-28 19:10 | 600 | 6 | COMPLETED | 저녁 안부 대화 | 주간 중간 |
| E1-20260130-0900-01 | 1 | 2026-01-30 09:00 | 2026-01-30 09:15 | 900 | 8 | COMPLETED | 오전 컨디션 대화 | 주간/일간 |
| E1-20260130-1830-01 | 1 | 2026-01-30 18:30 | 2026-01-30 18:51 | 1260 | 11 | COMPLETED | 외출 후 회고 대화 | 일간 대표 세션 |
| E1-20260130-2030-01 | 1 | 2026-01-30 20:30 | null | null | 2 | IN_PROGRESS | 진행 중 세션 | 선택 검증용 |
| E2-20260108-1000-01 | 2 | 2026-01-08 10:00 | 2026-01-08 10:07 | 420 | 4 | COMPLETED | 월초 짧은 대화 | 월간 sparse |
| E2-20260125-1100-01 | 2 | 2026-01-25 11:00 | 2026-01-25 11:08 | 480 | 5 | COMPLETED | 산책이 힘들었다는 이야기를 나눔 | 주간 sparse |
| E2-20260129-1600-01 | 2 | 2026-01-29 16:00 | 2026-01-29 16:13 | 780 | 6 | COMPLETED | 병원 방문 후 피로감을 표현 | 주간 sparse |
| E2-20260127-1300-01 | 2 | 2026-01-27 13:00 | 2026-01-27 13:05 | 300 | 3 | FAILED | 집계 제외 세션 | 선택 검증용 |

### 5.3 conversation_message

- 일간 상세 API의 `conv_logs` 확인용
- 현재 주간/월간 API는 `conversation_message`를 읽지 않는다.
- 최소 계획
  - `elder_id=1`의 `E1-20260130-1830-01` 세션에 5개 메시지
  - `speaker_name`은 `null`로 두어 fallback 이름(`정이안`, `말벗 AI`) 확인
  - `message_order`는 1부터 연속 증가

권장 메시지 흐름:

| session_key | message_order | speaker_type | speaker_name | content |
| --- | ---: | --- | --- | --- |
| E1-20260130-1830-01 | 1 | ELDER | null | 오늘은 병원 다녀오느라 조금 피곤했어. |
| E1-20260130-1830-01 | 2 | AI | null | 많이 피곤하셨겠네요. 오늘 가장 힘들었던 순간이 있었을까요? |
| E1-20260130-1830-01 | 3 | ELDER | null | 기다리는 시간이 길어서 좀 지쳤지만, 다녀오고 나니 마음은 편해졌어. |
| E1-20260130-1830-01 | 4 | AI | null | 검사 결과를 듣고 안심이 되셨군요. 지금은 좀 쉬고 계신가요? |
| E1-20260130-1830-01 | 5 | ELDER | null | 응, 저녁 먹고 쉬는 중이야. |

### 5.4 analysis_result

- 현재 API에서 직접 쓰는 핵심 컬럼
  - `conversation_session_id`
  - `elder_id`
  - `analysis_status`
  - `overall_score`
  - `summary_text`
- 권장 원칙
  - seed 단순화를 위해 `COMPLETED` 세션당 `SUCCESS/PARTIAL` 결과는 1건만 두는 편이 안전
  - 제외 동작 검증용으로 `FAILED` 결과는 선택적으로 1건 추가 가능
  - `elder_id`와 `conversation_session.elder_id`는 반드시 일치시킬 것

권장 삽입 계획:

| session_key | analysis_status | overall_score | summary_text | 목적 |
| --- | --- | ---: | --- | --- |
| E1-20260102-0900-01 | SUCCESS | 68 | 새해 이후 생활 리듬이 안정적입니다. | 월간 summary 1 |
| E1-20260106-1400-01 | SUCCESS | 72 | 식사와 수면 루틴을 차분히 유지하고 있습니다. | 월간 1주차 |
| E1-20260110-1000-01 | SUCCESS | 58 | 건강 염려를 자주 언급했지만 대화 참여는 좋았습니다. | 월간 summary 2 |
| E1-20260116-1500-01 | PARTIAL | 64 | 일상 흐름은 무난했으나 피로감 표현이 있었습니다. | 월간 전후반 경계 |
| E1-20260124-1000-01 | SUCCESS | 62 | 주말 일정과 가족 안부를 중심으로 대화했습니다. | 월간 summary 3 / 주간 |
| E1-20260126-0930-01 | SUCCESS | 78 | 산책 이후 기분이 비교적 밝았습니다. | 주간 |
| E1-20260128-1900-01 | SUCCESS | 74 | 저녁 시간에는 감정 표현이 비교적 안정적이었습니다. | 주간 |
| E1-20260130-0900-01 | SUCCESS | 70 | 오전에는 평온한 감정이 유지되었습니다. | 주간 |
| E1-20260130-1830-01 | SUCCESS | 82 | 외출 이야기를 길게 나누며 활력이 높게 나타났습니다. | 일간 대표 / 주간 |
| E2-20260108-1000-01 | SUCCESS | 52 | 월초 컨디션을 짧게 확인했습니다. | sparse 월간 summary |
| E2-20260125-1100-01 | SUCCESS | 48 | null | daily fallback 확인 |
| E2-20260129-1600-01 | PARTIAL | 60 |  | blank summary 처리 확인 |

- 보조 판단
  - `overall_score = null` 케이스도 추가할 수 있지만, 현재 목적상 `score null`은 세션 없는 날과 분석 결과 없는 날로 이미 확인 가능하다.
  - 우선 seed 1차는 `overall_score`를 넣고, 필요하면 2차 SQL에서 `overall_score null` 변형 케이스를 확장하는 편이 관리가 쉽다.

### 5.5 analysis_metric

- `analysis_result`별 `metric_type` 삽입 계획
- 사용 metric_type
  - `SOCIAL_ISOLATION`
  - `COGNITIVE_DECLINE`
  - `EMOTIONAL_VARIATION`
  - `DAILY_VITALITY`
  - `HEALTH_ANXIETY`
- 현재 API는 `metric_score`만 직접 사용한다.
- `baseline_score`, `score_change`는 현재 응답에 직접 쓰이지 않으므로 `null` 또는 간단한 샘플값으로 충분하다.

권장 원칙:

- `elder_id=1`
  - 핵심 `analysis_result`에는 5개 metric 전부 삽입
  - 특히 `2026-01-24 ~ 2026-01-30` 범위는 5종 모두 유지
  - weekly radar 평균이 전부 값 있는 형태가 되도록 설계
- `elder_id=2`
  - 일부 metric만 삽입해서 sparse/null 상태 검증
  - weekly/detail에서 `LOW/MEDIUM/HIGH/NO_DATA`가 동시에 나오게 설계

권장 점수 계획:

`elder_id=1` 최근 7일 핵심 metric 예시

| session_key | SI | CD | EV | DV | HA |
| --- | ---: | ---: | ---: | ---: | ---: |
| E1-20260124-1000-01 | 55 | 60 | 65 | 70 | 75 |
| E1-20260126-0930-01 | 60 | 62 | 68 | 74 | 78 |
| E1-20260128-1900-01 | 58 | 64 | 70 | 72 | 76 |
| E1-20260130-0900-01 | 62 | 66 | 74 | 80 | 82 |
| E1-20260130-1830-01 | 64 | 68 | 72 | 84 | 88 |

- 기대 효과
  - weekly radar 전 항목 값 존재
  - `HEALTH_ANXIETY`는 월간 요약에서 안정 문구 구간
  - `EMOTIONAL_VARIATION`은 월간 요약에서 중간 또는 높은 구간 확인 가능

`elder_id=2` 최근 7일 sparse metric 예시

| session_key | metric_type | metric_score | 목적 |
| --- | --- | ---: | --- |
| E2-20260125-1100-01 | SOCIAL_ISOLATION | 30 | LOW |
| E2-20260125-1100-01 | COGNITIVE_DECLINE | 50 | MEDIUM |
| E2-20260125-1100-01 | HEALTH_ANXIETY | 72 | HIGH |
| E2-20260129-1600-01 | SOCIAL_ISOLATION | 40 | LOW 평균 35 유도 |
| E2-20260129-1600-01 | COGNITIVE_DECLINE | 60 | MEDIUM 평균 55 유도 |
| E2-20260129-1600-01 | EMOTIONAL_VARIATION | 82 | HIGH |
| E2-20260108-1000-01 | DAILY_VITALITY | 58 | 월간 sparse 데이터 |
| E2-20260108-1000-01 | HEALTH_ANXIETY | 65 | 월간 sparse 데이터 |

- 기대 효과
  - 최근 7일 평균
    - `SOCIAL_ISOLATION -> 35 -> LOW`
    - `COGNITIVE_DECLINE -> 55 -> MEDIUM`
    - `EMOTIONAL_VARIATION -> 82 -> HIGH`
    - `DAILY_VITALITY -> NO_DATA`
    - `HEALTH_ANXIETY -> 72 -> HIGH`

## 6. 검증해야 할 응답 예시

### GET /api/main

예상 형태:

```json
{
  "data": [
    {
      "elder_id": 1,
      "name": "정이안",
      "age": 78,
      "gender": "FEMALE",
      "weekly_conv": 0,
      "score": [],
      "status": "STABLE"
    }
  ]
}
```

검증 포인트:

- 3명 모두 노출되는지
- 순서가 `1, 2, 3`인지
- 현재 구현상 `weekly_conv=0`, `score=[]`인지

### POST /api/elder/daily

정상 예시:

```json
{
  "data": {
    "timeline": {
      "start_time": "18:30:00",
      "end_time": "18:51:00",
      "conv_time": 1260
    },
    "conv_logs": [
      { "message_id": "101", "content": "...", "name": "정이안" },
      { "message_id": "102", "content": "...", "name": "말벗 AI" }
    ],
    "summary_text": "외출 이야기를 길게 나누며 활력이 높게 나타났습니다.",
    "score": [
      { "type": "SOCIAL_ISOLATION", "name": "사회적 고립", "score": 64 },
      { "type": "COGNITIVE_DECLINE", "name": "인지 저하", "score": 68 }
    ]
  }
}
```

빈 날짜 예시:

```json
{
  "data": {
    "timeline": {
      "start_time": null,
      "end_time": null,
      "conv_time": null
    },
    "conv_logs": [],
    "summary_text": null,
    "score": []
  }
}
```

검증 포인트:

- 최신 `COMPLETED` 세션이 선택되는지
- `conv_logs`가 `message_order`대로 내려오는지
- `summary_text null`일 때 세션 요약 fallback 되는지
- 세션 없을 때도 `200`과 빈 구조를 유지하는지

### POST /api/elder/weekly

예상 형태:

```json
{
  "data": {
    "weekly_data": [
      { "date": "2026-01-24", "day": "토", "score": 62, "conv_time": 15 },
      { "date": "2026-01-25", "day": "일", "score": null, "conv_time": 0 }
    ],
    "weekly_scores_radar": [
      { "type": "SOCIAL_ISOLATION", "name": "사회적 고립", "score": 60 }
    ],
    "summaries": [
      { "date": "2026-01-24", "summary_text": "..." }
    ]
  }
}
```

검증 포인트:

- `weekly_data.length == 7`
- `01-24 ~ 01-30` 날짜와 요일이 맞는지
- 하루 2세션인 `01-30`의 `score`가 평균, `conv_time`이 합계인지
- 데이터 없는 날짜는 `score=null`, `conv_time=0`인지
- `FAILED` 세션/분석 결과가 제외되는지

### POST /api/elder/weekly/detail

예상 형태:

```json
{
  "data": {
    "guides": [
      { "type": 0, "status": "LOW" },
      { "type": 1, "status": "MEDIUM" },
      { "type": 2, "status": "HIGH" },
      { "type": 3, "status": "NO_DATA" },
      { "type": 4, "status": "HIGH" }
    ]
  }
}
```

검증 포인트:

- 응답은 문구가 아니라 `status` 기반인지
- 5개 타입이 항상 모두 오는지
- sparse 케이스에서 `NO_DATA`가 실제로 나오는지

### POST /api/elder/monthly

예상 형태:

```json
{
  "data": {
    "monthly_data": [
      { "date": "2026-01-01", "day": "목", "score": null, "conv_time": 0 },
      { "date": "2026-01-02", "day": "금", "score": 68, "conv_time": 12 }
    ],
    "weekly_scores": [
      { "week": 1, "score": 70 },
      { "week": 2, "score": 58 }
    ],
    "weekly_conv_time": [
      { "week": 1, "conv_time": 27 },
      { "week": 2, "conv_time": 20 }
    ],
    "monthly_summaries": [
      { "type": "SUMMARY", "title": "한 달 요약", "content": "..." },
      { "type": "CONVERSATION_TREND", "title": "대화 추이 분석", "content": "..." },
      { "type": "HEALTH_ANXIETY", "title": "건강 우려 분석", "content": "..." },
      { "type": "EMOTIONAL_STABILITY", "title": "정서 안정도 분석", "content": "..." }
    ]
  }
}
```

검증 포인트:

- `monthly_data.length == 31`
- 모든 날짜가 빠짐없이 포함되는지
- `weekly_scores.length == 5`, `weekly_conv_time.length == 5`
- 주차 구간이 달력 주차가 아니라 `7일 고정 버킷`인지
- `monthly_summaries`는 데이터가 없어도 4개가 유지되는지

## 7. 다음 단계

- 이 리포트를 기준으로 실제 SQL seed 파일을 작성할 예정이다.
- 다음 작업에서는 아래를 진행하면 된다.
  - `elder`, `conversation_session`, `conversation_message`, `analysis_result`, `analysis_metric`용 `INSERT SQL` 작성
  - 필요 시 기존 테스트 데이터 정리용 `TRUNCATE/DELETE` 전략 확정
  - 배포 서버 DB의 기존 시퀀스와 `id=1,2,3` 충돌 여부 확인
- 이번 단계에서는 SQL 파일을 만들지 않았고, 데이터 계획만 정리했다.
