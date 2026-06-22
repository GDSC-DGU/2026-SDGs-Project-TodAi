# Internal Analysis Job Phase 1 Summary

## 1. 생성/수정한 파일 목록

### 생성

- `src/main/java/com/solchall/todai/api/internal/analysisjob/controller/AnalysisJobInternalController.java`
- `src/main/java/com/solchall/todai/api/internal/analysisjob/dto/CreateAnalysisJobRequest.java`
- `src/main/java/com/solchall/todai/api/internal/analysisjob/dto/CreateAnalysisJobResponse.java`
- `src/main/java/com/solchall/todai/api/internal/analysisjob/dto/CreateAnalysisJobEventRequest.java`
- `src/main/java/com/solchall/todai/api/internal/analysisjob/dto/CreateAnalysisJobEventResponse.java`
- `src/main/java/com/solchall/todai/api/internal/analysisjob/dto/UpdateAnalysisJobStatusRequest.java`
- `src/main/java/com/solchall/todai/api/internal/analysisjob/dto/UpdateAnalysisJobStatusResponse.java`
- `src/main/java/com/solchall/todai/api/internal/analysisjob/service/AnalysisJobInternalService.java`
- `src/main/java/com/solchall/todai/domain/analysisjob/entity/AnalysisJobEvent.java`
- `src/main/java/com/solchall/todai/domain/analysisjob/entity/AnalysisJobEventType.java`
- `src/main/java/com/solchall/todai/domain/analysisjob/entity/EventStatus.java`
- `src/main/java/com/solchall/todai/domain/analysisjob/entity/WorkerType.java`
- `src/main/java/com/solchall/todai/domain/analysisjob/repository/AnalysisJobEventRepository.java`
- `src/test/java/com/solchall/todai/api/internal/analysisjob/AnalysisJobInternalControllerTest.java`
- `docs/internal-analysis-job-phase1-summary.md`

### 수정

- `src/main/java/com/solchall/todai/domain/analysisjob/entity/AnalysisJob.java`
- `src/main/java/com/solchall/todai/domain/analysisjob/entity/AnalysisJobStatus.java`
- `src/main/java/com/solchall/todai/domain/analysisjob/repository/AnalysisJobRepository.java`
- `src/main/java/com/solchall/todai/domain/conversation/entity/ConversationSession.java`
- `src/main/java/com/solchall/todai/domain/conversation/repository/ConversationSessionRepository.java`

## 2. 구현된 내부 API 목록

- `POST /api/internal/analysis-jobs`
- `POST /api/internal/analysis-jobs/{job_id}/events`
- `PATCH /api/internal/analysis-jobs/{job_id}/status`

## 3. 기존 공개 API에 영향이 없음을 확인한 내용

- 기존 공개 API path (`/api/elder`, `/api/main`) 변경 없음
- 기존 공개 Controller, Service, DTO 수정 없음
- 기존 공개 응답 DTO 필드명/타입/null 구조 변경 없음
- 기존 공개 조회 로직 수정 없음
- 내부 연동 API는 `/api/internal/analysis-jobs` 전용 Controller로 분리
- 전체 테스트 실행 결과 기존 공개 API 테스트 포함 통과

## 4. 추가/수정된 Entity 필드

### `conversation_session`

- `elder` nullable 허용
- `session_key` unique/not null 보강
- `started_at` nullable 허용
- `created_at`, `updated_at` 자동 세팅 추가

### `analysis_job`

- 추가: `session_key`
- 추가: `correlation_id`
- 추가: `requested_workers`
- 추가: `request_payload`
- 추가: `error_reason`
- 상태 업데이트용 도메인 메서드 추가

### `analysis_job_event`

- 신규 엔티티 추가
- 필드:
  - `analysis_job_id`
  - `correlation_id`
  - `worker_type`
  - `event_type`
  - `event_status`
  - `queue_name`
  - `routing_key`
  - `message`
  - `error_reason`
  - `payload_json`
  - `occurred_at`
  - `created_at`

## 5. 추가/수정된 Enum

### `AnalysisJobStatus`

- `PENDING`
- `PUBLISHED`
- `PROCESSING`
- `COMPLETED`
- `PARTIAL_FAILED`
- `FAILED`
- `PARTIAL_TIMEOUT`
- `TIMEOUT`
- `DEAD_LETTER`

### 신규 Enum

- `AnalysisJobEventType`
- `EventStatus`
- `WorkerType`

## 6. 테스트 결과

- 신규 내부 API 테스트 추가 완료
- 기존 공개 API 테스트 포함 `./gradlew test` 통과
- 검증된 주요 케이스:
  - job 생성 성공
  - `job_id` 문자열 응답
  - 동일 `session_id` 재사용
  - 빈 `elder_id` 허용
  - 중복 `correlation_id` 409
  - event 기록 성공
  - 확장 필드 없는 event 기록 성공
  - 없는 `job_id` event 기록 404
  - `completed -> COMPLETED`
  - `partial_failed -> PARTIAL_FAILED`
  - `partial_timeout -> PARTIAL_TIMEOUT`
  - `timeout -> TIMEOUT`
  - 잘못된 status 400

## 7. 남은 2차 구현 범위

- `POST /api/internal/analysis-jobs/{job_id}/result`
- `analysis_result` 저장
- `analysis_metric` 저장
- ADK 성공/실패/skipped 결과 저장
- Go 미들웨어 result 저장 client 추가
- Go 미들웨어의 Spring API 호출 경로를 `/api/internal/...`로 수정
