# Spring Analysis Job Integration Review

## 1. 현재 Spring 구현 상태 요약

### 현재 상태 확인 결과

- 내부 연동용 `POST /internal/analysis-jobs`, `POST /internal/analysis-jobs/{job_id}/events`, `PATCH /internal/analysis-jobs/{job_id}/status` 는 현재 구현되어 있지 않다.
- 현재 컨트롤러는 공개 조회 API만 있다. 예시는 `api/elder`, `api/main` 조회 컨트롤러다.
- `analysis_job`, `analysis_result`, `analysis_metric`, `conversation_session`, `elder` 엔티티는 존재한다.
- `analysis_job_event` 또는 `job_event_history` 성격의 엔티티/리포지토리/서비스는 없다.
- `AnalysisJobRepository` 는 존재하지만 메인 소스에서 주입/사용되지 않는다.
- 메인 소스에는 `AnalysisJob`, `AnalysisResult`, `AnalysisMetric` 저장 서비스가 없다. 현재 쓰기 예시는 테스트 코드에서만 보인다.
- DB 생성/변경은 Flyway/Liquibase 없이 JPA `ddl-auto: update` 에 의존한다.
- `schema-postgresql.sql` 은 전체 migration 이 아니라 일부 `ALTER TABLE` 만 포함한다.
- RabbitMQ 관련 Spring 의존성은 현재 없다.
- 공통 `@ControllerAdvice` 예외 처리 구조는 보이지 않는다.
- `./gradlew test` 는 현재 통과했다.

### 설계 필요 항목

- `analysis_job` 를 실제 Go 미들웨어 계약에 맞는 오케스트레이션 상태 테이블로 재정의해야 한다.
- `analysis_job_event` append-only 이력 테이블이 필요하다.
- `analysis_result` 는 최종 결과 저장소로 확장해야 한다. 현재는 STT 본문, emotion score, ADK 상태를 담을 구조가 없다.
- `analysis_metric` 은 ADK metric 저장에 재사용 가능하지만, 현재 enum 과 ADK 필드명 사이에 충돌이 있다.
- `job status` 와 `ADK status` 를 분리해야 한다.

## 2. 이미 구현된 것

### 내부 API 구현 여부

| API | 구현 여부 | Controller | Service | DTO | Entity 연결 | 실제 DB 저장 | 예외/트랜잭션 |
|---|---|---|---|---|---|---|---|
| `POST /internal/analysis-jobs` | 없음 | 없음 | 없음 | 없음 | 후보 엔티티만 있음 | 없음 | 없음 |
| `POST /internal/analysis-jobs/{job_id}/events` | 없음 | 없음 | 없음 | 없음 | 연결 엔티티 없음 | 없음 | 없음 |
| `PATCH /internal/analysis-jobs/{job_id}/status` | 없음 | 없음 | 없음 | 없음 | 후보 엔티티만 있음 | 없음 | 없음 |

### 현재 분석 관련 도메인 모델

- `analysis_job` 엔티티는 존재한다.
  - 상태 메서드도 있다: `markPublished`, `markProcessing`, `markSuccess`, `markFailed`, `markDeadLetter`
- `analysis_result` 엔티티/리포지토리는 존재한다.
- `analysis_metric` 엔티티/리포지토리는 존재한다.
- `conversation_session`, `elder` 엔티티/리포지토리는 존재한다.
- 현재 서비스는 읽기 전용 분석 조회 API만 구현되어 있다.

## 3. 없는 것 또는 불완전한 것

- `/internal/analysis-jobs` 계열 API 3개 모두 없음
- `analysis_job_event` 테이블/엔티티/리포지토리 없음
- `AnalysisJob` 를 실제로 저장/조회/업데이트하는 서비스 없음
- `AnalysisResult` 를 생성/업데이트하는 메인 서비스 없음
- `AnalysisMetric` 를 저장하는 메인 서비스 없음
- RabbitMQ 관련 Spring 코드 없음
- `@ControllerAdvice` 기반 공통 예외 처리 없음
- 현재 예외 처리는 서비스에서 `ResponseStatusException` 직접 사용
- 쓰기 트랜잭션 경로 없음. 현재 서비스는 전부 `@Transactional(readOnly = true)`
- `analysis_result` 와 `analysis_job` 연결 방식이 일관되지 않음
  - `analysis_job.analysis_result_id` FK 비슷한 필드가 있음
  - `analysis_result.analysis_job_id` 는 단순 `Long` 필드임
- `conversation_session.created_at`, `updated_at` 는 컬럼만 있고 자동 세팅 로직이 없음
- `elder` 는 `created_at`, `updated_at` 자체가 없음

## 4. Go 미들웨어 계약과 안 맞는 부분

### 필드 계약

- `job_id`
  - 현재 Spring 의 자연 후보는 `AnalysisJob.id` 인 `Long`
  - Go 가 문자열 UUID 기반 `job_id` 를 기대하면 현재 구조와 맞지 않음
- `session_id`
  - 현재 DB PK 는 `ConversationSession.id` `Long`
  - 문자열 세션 식별자는 `sessionKey` 가 따로 있음
  - Go 의 `session_id` 가 DB PK 인지, 외부 세션 키인지 계약이 불명확함
- `elder_id`
  - `Long` 으로 받는 구조와는 맞음
- `correlation_id`
  - 없음
  - 가장 비슷한 필드는 `requestId` 이지만 의미가 다름
- `worker_type`
  - 없음
- `queue_name`
  - 있음
- `routing_key`
  - 있음
- `status`
  - job status enum 은 있으나 계약 값과 다름
- `error_reason`
  - 없음
  - 가장 가까운 필드는 `errorMessage`
- `event_type`
  - 없음
- emotion result
  - `sadness`, `anxiety`, `neutral`, `joy` 저장 컬럼 없음
- STT result
  - `text` 저장 컬럼 없음
- ADK metric result
  - `analysis_metric` 로 저장 가능한 구조는 있으나, enum 키가 정확히 일치하지 않음

### enum 계약

- Go Aggregator 최종 status
  - 기대값: `completed`, `partial_failed`, `failed`, `partial_timeout`, `timeout`
  - 현재 Spring `AnalysisJobStatus`: `PENDING`, `PUBLISHED`, `PROCESSING`, `SUCCESS`, `FAILED`, `DEAD_LETTER`
  - `completed`, `partial_failed`, `partial_timeout`, `timeout` 을 그대로 받을 수 없음
- Python WorkerResponse status
  - 기대값: `success`, `failed`
  - 현재 `AnalysisJobStatus` 와 대소문자도 다르고 의미 계층도 다름
- `AnalysisStatus`
  - 현재는 `PENDING`, `SUCCESS`, `FAILED`, `PARTIAL`
  - 읽기 서비스는 `SUCCESS`, `PARTIAL` 만 조회함
- Jackson enum 대소문자 완화 설정은 보이지 않음
  - 별도 `ObjectMapper`/`spring.jackson` 설정 없음
  - 따라서 현재 스타일이라면 대문자 변환 또는 커스텀 매핑이 필요함

### metric enum 이름 충돌

- 현재 metric enum
  - `SOCIAL_ISOLATION`
  - `HEALTH_ANXIETY`
  - `DAILY_VITALITY`
  - `EMOTIONAL_VARIATION`
  - `COGNITIVE_DECLINE`
- ADK 필드
  - `social_isolation`, `health_anxiety`, `daily_vitality`, `emotion_variance`, `cognitive_load`
- 판단
  - `social_isolation`, `health_anxiety`, `daily_vitality` 는 1:1 매핑 가능
  - `emotion_variance` 와 `EMOTIONAL_VARIATION` 은 이름 차이만 있음
  - `cognitive_load` 와 `COGNITIVE_DECLINE` 는 의미 차이일 수 있어 확인 필요
- 현재 공개 API 응답은 enum `name()` 을 그대로 내보냄

## 5. DB 설계를 다시 해야 하는 부분

- `analysis_job` 과 `analysis_result` 관계를 한 방향으로 정리해야 함
- `analysis_job_event` 이력을 신설해야 함
- `analysis_job.status` 와 `analysis_result.adk_status` 를 분리하는 쪽이 적절함
- `session_id` 의미를 확정해야 함
  - DB PK `conversation_session.id`
  - 외부 세션 키 `conversation_session.session_key`
- `analysis_result` 에 STT text, emotion probability, ADK 실패 정보 저장 컬럼을 추가해야 함
- `analysis_metric` 는 `analysis_result_id + metric_type` 유니크 제약이 필요함
- `analysis_result.analysis_job_id` 는 유니크 제약이 필요함
- 현재 `ddl-auto: update` 중심 운영은 파이프라인 계약이 커질수록 위험함. migration 기반 관리가 적절함

## 6. 추천 테이블 설계 초안

### `analysis_job`

- 유지 대상
  - `id`
  - `elder_id`
  - `conversation_session_id`
  - `queue_name`
  - `routing_key`
  - `status`
  - `published_at`
  - `started_at`
  - `finished_at`
  - `error_reason`
  - `created_at`
  - `updated_at`
- 추가 권장
  - `correlation_id`
  - `job_type`
  - `request_payload`
- 상태 enum 권장
  - `PENDING`
  - `PUBLISHED`
  - `PROCESSING`
  - `COMPLETED`
  - `PARTIAL_FAILED`
  - `FAILED`
  - `PARTIAL_TIMEOUT`
  - `TIMEOUT`
- 제약 권장
  - `conversation_session_id NOT NULL`
  - `elder_id NOT NULL`
  - `correlation_id UNIQUE`
- 판단
  - 이 테이블은 큐/Worker/Aggregator 진행 상태 전용으로 두는 게 맞음

### `analysis_job_event`

- 신규 필요
- 권장 컬럼
  - `id`
  - `analysis_job_id`
  - `correlation_id`
  - `worker_type`
  - `event_type`
  - `queue_name`
  - `routing_key`
  - `status`
  - `error_reason`
  - `payload_json`
  - `occurred_at`
  - `created_at`
- 판단
  - publish 시작/성공/실패, reply 수신, aggregator 상태 변경, ADK 요청/성공/실패를 모두 append-only 로 저장하는 용도
  - 이 테이블이 있어야 Go middleware 의 step 3~8 이력 추적 가능

### `analysis_result`

- 현재 엔티티 확장 권장
- 권장 컬럼
  - `id`
  - `analysis_job_id UNIQUE`
  - `elder_id`
  - `conversation_session_id`
  - `analysis_status`
  - `adk_status`
  - `stt_text`
  - `summary_text`
  - `overall_score`
  - `error_reason`
  - `adk_error_reason`
  - `created_at`
  - `updated_at`
- 상태 권장
  - `analysis_status`: `SUCCESS`, `PARTIAL`, `FAILED`
  - `adk_status`: `PENDING`, `SUCCESS`, `FAILED`
- 판단
  - Go Aggregator 최종 status 는 `analysis_job.status` 에 원문 그대로 보관
  - 조회 API 친화적인 요약 상태는 `analysis_result.analysis_status` 로 coarse-grained 변환

### `analysis_metric`

- 현재 구조 재사용 가능
- 권장 제약
  - `analysis_result_id NOT NULL`
  - `metric_type NOT NULL`
  - `UNIQUE (analysis_result_id, metric_type)`
- metric 매핑 권장
  - `social_isolation -> SOCIAL_ISOLATION`
  - `health_anxiety -> HEALTH_ANXIETY`
  - `daily_vitality -> DAILY_VITALITY`
  - `emotion_variance -> EMOTIONAL_VARIATION`
  - `cognitive_load ->` 즉시 `COGNITIVE_DECLINE` 로 매핑하지 말고 의미 확인 후 결정

## 7. 추천 API 설계 초안

### `POST /internal/analysis-jobs`

- 필요함
- 역할
  - WebSocket 종료 후 Spring 이 `analysis_job` 생성
  - Go middleware 는 응답의 `job_id` 를 이후 event/status/result API 에 사용
- 권장 요청 필드
  - `conversation_session_id` 또는 `session_key`
  - `elder_id`
  - `correlation_id`
  - `queue_name`
  - `routing_key`
  - `job_type`
- 권장 응답 필드
  - `job_id`
  - `status`
  - `correlation_id`
  - `created_at`

### `POST /internal/analysis-jobs/{job_id}/events`

- 필요함
- 역할
  - publish 시작/성공/실패
  - worker reply 수신
  - aggregator 단계 이벤트
  - ADK 호출/실패 기록
- 권장 요청 필드
  - `event_type`
  - `worker_type`
  - `status`
  - `queue_name`
  - `routing_key`
  - `correlation_id`
  - `error_reason`
  - `payload`
  - `occurred_at`

### `PATCH /internal/analysis-jobs/{job_id}/status`

- 필요함
- 역할
  - job 최종 상태 변경
- 권장 요청 필드
  - `status`
  - `error_reason`
  - `started_at`
  - `finished_at`

### `POST /internal/analysis-jobs/{job_id}/result`

- 현재 구조 기준으로 필요함
- 이유
  - Spring 쪽에 `AnalysisResult` 저장 API가 전혀 없음
  - ADK 결과가 현재 로그만 남고 DB 저장되지 않으므로, Go 가 최종 집계 결과를 넘길 저장 진입점이 필요함
- 권장 판단
  - `result` 와 `metric` 은 한 API에서 함께 저장하는 것이 낫다
  - 이유는 `analysis_result` 와 `analysis_metric` 이 강하게 결합되어 있고, 한 트랜잭션으로 upsert 해야 중복/불일치를 막을 수 있기 때문
- 권장 처리 방식
  - `job_id` 로 기존 `analysis_result` 조회
  - 있으면 update
  - 없으면 insert
  - metric 은 기존 `analysis_result_id` 기준 삭제 후 재삽입 또는 type 단위 upsert
- 부분 실패/timeout 처리
  - `text`, `emotion`, `metrics` 를 nullable 로 허용
  - 들어온 값만 저장
  - `analysis_job.status` 는 `PARTIAL_FAILED` 또는 `TIMEOUT` 유지
  - `analysis_result.analysis_status` 는 `PARTIAL` 또는 `FAILED` 로 매핑
- ADK 실패 처리
  - `analysis_job.status` 를 바꾸지 않는 것이 낫다
  - `analysis_result.adk_status = FAILED` 로 분리하는 쪽이 맞다
- 요청 JSON 에 대한 코멘트
  - `elder_id` 는 문자열 `"4"` 보다는 숫자 `4` 로 고정하는 편이 낫다
  - `session_id` 는 현재 구조상 의미가 모호하므로 `conversation_session_id` 또는 `session_key` 로 명시하는 편이 낫다
  - `status` 는 Go 원문 값을 job status 로 받고, 내부에서 `analysis_status` 로 2차 변환하는 방식이 좋다

## 8. 내가 Spring 담당자로서 바로 해야 할 작업 목록

1. Go 팀과 `job_id` 타입, `session_id` 의미, `correlation_id` 생성 주체를 먼저 확정
2. `analysis_job` 상태 enum 을 Go Aggregator 최종 상태와 맞게 재정의
3. `analysis_job_event` 엔티티/리포지토리 추가
4. `AnalysisJobInternalController`, `AnalysisJobInternalService`, 내부 DTO 4종 생성
5. `POST /internal/analysis-jobs` 생성 API 구현
6. `POST /internal/analysis-jobs/{job_id}/events` append-only 이벤트 API 구현
7. `PATCH /internal/analysis-jobs/{job_id}/status` 최종 상태 업데이트 API 구현
8. `analysis_result` 확장 후 `POST /internal/analysis-jobs/{job_id}/result` upsert API 구현
9. `MetricType` 와 ADK 필드 매핑 정책 확정
10. `analysis_result.analysis_job_id` 유니크, `analysis_metric (analysis_result_id, metric_type)` 유니크 제약 추가
11. 내부 API 테스트 추가
12. `ddl-auto: update` 대신 migration 스크립트로 관리 전환
