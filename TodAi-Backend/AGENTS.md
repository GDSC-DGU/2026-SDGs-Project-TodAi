
````md
# AGENTS.md

## 역할

너는 `todai` 백엔드 개발을 돕는 코딩 에이전트다.

`todai`는 어르신 말벗 서비스의 백엔드 프로젝트이며, 대화 세션, 어르신 정보, 사회복지사 정보, 분석 결과, 분석 지표, 리포트 데이터를 관리한다.

목표는 단순히 코드를 많이 생성하는 것이 아니라, 현재 프로젝트 구조에 맞게 안정적이고 유지보수 가능한 Spring Boot 백엔드 코드를 구현하는 것이다.

---

## 기본 원칙

코드를 작성하거나 수정할 때는 다음 원칙을 지켜라.

1. 기존 프로젝트 구조와 스타일을 우선 따른다.
2. 불필요하게 큰 구조 변경을 하지 않는다.
3. 한 번에 너무 많은 기능을 섞지 않는다.
4. Controller, Service, Repository, DTO, Entity 역할을 명확히 분리한다.
5. 비즈니스 로직은 Controller가 아니라 Service에 둔다.
6. API 응답 형식은 기존 프로젝트의 공통 응답 구조가 있다면 그것을 따른다.
7. 예외 처리는 기존 GlobalExceptionHandler 또는 공통 예외 처리 방식에 맞춘다.
8. 임의로 패키지명, DB명, 프로젝트명을 바꾸지 않는다.
9. 프로젝트명은 항상 `todai`를 기준으로 사용한다.
10. 사용자가 요청하지 않은 인증/로그인 기능은 임의로 추가하지 않는다.

---

## 기술 스택 기준

기본적으로 다음 스택을 기준으로 작업한다.

- Java
- Spring Boot
- Spring Web
- Spring Data JPA
- PostgreSQL
- Gradle
- Docker
- Docker Compose

단, 실제 프로젝트 설정이 다르면 반드시 기존 파일을 먼저 확인하고 그에 맞게 작업한다.

---

## 작업 전 확인할 파일

작업 전에는 프로젝트 구조를 먼저 확인한다.

```bash
ls
find . -maxdepth 3 -type f | sort
cat build.gradle
cat settings.gradle
find src/main -type f | sort
````

필요하면 다음 파일도 확인한다.

```bash
cat docker-compose.yml
cat Dockerfile
find src/test -type f | sort
```

---

## 현재 MVP 전제

현재 MVP에서는 로그인 기능을 구현하지 않는다.

사회복지사와 어르신 정보는 DB에 직접 입력되어 있다고 가정한다.

따라서 인증/인가 기능을 임의로 추가하지 말고, 우선 다음 도메인 중심으로 기능을 구현한다.

* `elder`
* `social_worker`
* `elder_social_worker`
* `conversation_session`
* `analysis_result`
* `analysis_metric`
* `report`

---

## 도메인 개요

### 1. elder

어르신 기본 정보를 관리한다.

예상 역할:

* 어르신 등록
* 어르신 조회
* 어르신 수정
* 어르신 삭제 또는 비활성화

예상 필드:

* id
* name
* birthDate
* gender
* phoneNumber
* address
* createdAt
* updatedAt

---

### 2. social_worker

사회복지사 정보를 관리한다.

예상 역할:

* 사회복지사 등록
* 사회복지사 조회
* 사회복지사 수정
* 사회복지사 삭제 또는 비활성화

예상 필드:

* id
* name
* phoneNumber
* organization
* createdAt
* updatedAt

---

### 3. elder_social_worker

어르신과 담당 사회복지사의 매핑 관계를 관리한다.

예상 역할:

* 어르신 담당 사회복지사 연결
* 특정 사회복지사가 담당하는 어르신 목록 조회
* 특정 어르신의 담당 사회복지사 조회

예상 필드:

* id
* elder
* socialWorker
* createdAt

---

### 4. conversation_session

대화 하나의 단위를 관리한다.

서비스에서는 세션 하나가 어르신과 진행한 하나의 대화 단위가 된다.

예상 역할:

* 대화 세션 시작
* 대화 세션 종료
* 어르신별 대화 세션 목록 조회
* 특정 대화 세션 조회
* 세션 상태 관리

예상 필드:

* id
* elder
* startedAt
* endedAt
* status
* createdAt
* updatedAt

상태 예시:

* IN_PROGRESS
* COMPLETED
* FAILED

---

### 5. analysis_result

대화 세션 단위의 분석 결과를 관리한다.

하나의 대화 세션에는 하나의 분석 결과가 연결될 수 있다.

예상 역할:

* 대화 세션에 대한 분석 결과 저장
* 대화 세션별 분석 결과 조회
* 분석 요약, 전체 감정, 위험도 관리

예상 필드:

* id
* conversationSession
* summary
* overallEmotion
* riskLevel
* createdAt
* updatedAt

---

### 6. analysis_metric

분석 결과에 속하는 세부 지표 점수를 관리한다.

하나의 분석 결과에는 여러 분석 지표가 연결될 수 있다.

분석 지표는 `analysis_result`와 연결되어야 한다.

예상 역할:

* 분석 결과별 세부 점수 저장
* 분석 결과별 세부 지표 조회
* 우울감, 고립감, 불안감 등 점수 관리

예상 지표:

* depressionScore
* lonelinessScore
* anxietyScore
* cognitiveScore
* conversationEngagementScore

단, 실제 구현 시에는 현재 확정된 DB 명세를 우선한다.

---

### 7. report

분석 결과를 기반으로 생성된 리포트를 관리한다.

예상 역할:

* 분석 결과 기반 리포트 생성
* 어르신별 리포트 목록 조회
* 특정 리포트 상세 조회

예상 필드:

* id
* elder
* analysisResult
* title
* content
* createdAt
* updatedAt

---

## 구현 구조 원칙

기능 구현 시 기존 프로젝트 구조를 우선 따른다.

만약 아직 구조가 명확하지 않다면 다음 구조 중 하나를 사용한다.

### 도메인 단위 패키지 구조

```text
elder/
  controller/
  service/
  repository/
  entity/
  dto/
```

예시:

```text
elder/
  controller/ElderController.java
  service/ElderService.java
  repository/ElderRepository.java
  entity/Elder.java
  dto/CreateElderRequest.java
  dto/UpdateElderRequest.java
  dto/ElderResponse.java
```

또는 프로젝트가 계층형 구조를 사용하고 있다면 다음 방식을 따른다.

```text
domain/
  entity/
  repository/
  service/
  dto/
  controller/
```

기존 구조가 있다면 새 구조를 만들지 말고 기존 구조에 맞춘다.

---

## Entity 작성 원칙

JPA Entity 작성 시 다음 원칙을 따른다.

1. 테이블명은 명확하게 지정한다.
2. 연관관계는 필요한 경우에만 추가한다.
3. 양방향 연관관계는 신중하게 사용한다.
4. `@ManyToOne(fetch = FetchType.LAZY)`를 기본으로 사용한다.
5. Entity를 API 응답에 직접 노출하지 않는다.
6. API 응답에는 DTO를 사용한다.
7. 생성/수정 시간은 공통 BaseEntity가 있으면 재사용한다.
8. BaseEntity가 없다면 프로젝트 스타일에 맞춰 `createdAt`, `updatedAt` 처리 방식을 추가한다.
9. Setter를 무분별하게 열지 않는다.
10. 생성자, 정적 팩토리 메서드, 도메인 메서드를 활용한다.

---

## DTO 작성 원칙

DTO는 요청 DTO와 응답 DTO를 분리한다.

예시:

```text
CreateElderRequest
UpdateElderRequest
ElderResponse
```

DTO 작성 시 다음 원칙을 따른다.

1. 요청값 검증이 필요하면 Bean Validation을 사용한다.
2. 응답 DTO에는 필요한 필드만 포함한다.
3. Entity 전체를 그대로 반환하지 않는다.
4. Entity 변환 로직은 static factory method를 사용할 수 있다.
5. 요청 DTO와 응답 DTO를 하나로 합치지 않는다.

예시:

```java
public static ElderResponse from(Elder elder) {
    return new ElderResponse(
        elder.getId(),
        elder.getName()
    );
}
```

---

## Controller 작성 원칙

Controller는 HTTP 요청과 응답만 담당한다.

Controller에서 하지 말아야 할 것:

* 비즈니스 로직 처리
* Entity 직접 수정
* Repository 직접 호출
* 복잡한 조건 분기
* 트랜잭션 처리

Controller는 Service를 호출하고 DTO를 반환한다.

예시 API 스타일:

```text
GET    /api/v1/elders
POST   /api/v1/elders
GET    /api/v1/elders/{elderId}
PATCH  /api/v1/elders/{elderId}
DELETE /api/v1/elders/{elderId}
```

---

## Service 작성 원칙

Service는 비즈니스 로직을 담당한다.

Service에서 처리할 것:

* Entity 조회
* 존재 여부 검증
* 연관 데이터 검증
* 상태 변경
* 트랜잭션 처리
* Repository 호출
* 잘못된 상태 전이 방지

쓰기 작업에는 `@Transactional`을 사용한다.

읽기 작업에는 가능하면 `@Transactional(readOnly = true)`를 사용한다.

---

## Repository 작성 원칙

Repository는 Spring Data JPA를 사용한다.

복잡한 쿼리가 필요하지 않으면 기본 `JpaRepository`를 우선 사용한다.

예시:

```java
public interface ElderRepository extends JpaRepository<Elder, Long> {
}
```

필요한 경우에만 커스텀 쿼리를 추가한다.

---

## API 설계 원칙

REST API는 다음 스타일을 따른다.

### Elder

```text
GET    /api/v1/elders
POST   /api/v1/elders
GET    /api/v1/elders/{elderId}
PATCH  /api/v1/elders/{elderId}
DELETE /api/v1/elders/{elderId}
```

### Social Worker

```text
GET    /api/v1/social-workers
POST   /api/v1/social-workers
GET    /api/v1/social-workers/{socialWorkerId}
PATCH  /api/v1/social-workers/{socialWorkerId}
DELETE /api/v1/social-workers/{socialWorkerId}
```

### Elder Social Worker Mapping

```text
POST   /api/v1/elders/{elderId}/social-workers/{socialWorkerId}
GET    /api/v1/social-workers/{socialWorkerId}/elders
GET    /api/v1/elders/{elderId}/social-workers
DELETE /api/v1/elders/{elderId}/social-workers/{socialWorkerId}
```

### Conversation Session

```text
POST   /api/v1/elders/{elderId}/sessions
GET    /api/v1/elders/{elderId}/sessions
GET    /api/v1/sessions/{sessionId}
PATCH  /api/v1/sessions/{sessionId}/end
```

### Analysis Result

```text
POST   /api/v1/sessions/{sessionId}/analysis-results
GET    /api/v1/sessions/{sessionId}/analysis-results
```

### Report

```text
POST   /api/v1/analysis-results/{analysisResultId}/reports
GET    /api/v1/elders/{elderId}/reports
GET    /api/v1/reports/{reportId}
```

단, 실제 구현 시에는 사용자가 요청한 API 범위만 구현한다.

---

## 예외 처리 원칙

예외는 임의로 `RuntimeException`만 던지지 않는다.

기존 프로젝트에 커스텀 예외 구조가 있으면 그것을 따른다.

예상 예외:

* 리소스를 찾을 수 없음
* 잘못된 요청
* 중복 데이터
* 잘못된 상태 전이
* 연관 데이터 불일치
* 이미 종료된 세션
* 이미 분석 결과가 존재하는 세션

예시:

```java
throw new NotFoundException("어르신을 찾을 수 없습니다.");
```

기존 예외 클래스가 없다면, 먼저 프로젝트 스타일을 확인한 뒤 최소한의 공통 예외 구조를 제안한다.

---

## 대화 세션 처리 원칙

대화 세션은 하나의 대화 단위를 의미한다.

세션 관련 기능 구현 시 다음을 고려한다.

1. 세션 시작 시 `startedAt`을 기록한다.
2. 세션 종료 시 `endedAt`을 기록한다.
3. 진행 중인 세션과 종료된 세션의 상태를 구분한다.
4. 이미 종료된 세션을 다시 종료하지 않도록 한다.
5. 분석 결과는 종료된 세션에만 생성하는 것을 우선 고려한다.
6. 세션과 분석 결과의 관계는 명확히 관리한다.

---

## 분석 결과 및 분석 지표 처리 원칙

분석 결과는 대화 세션 단위로 저장한다.

분석 지표는 분석 결과에 종속된다.

구현 시 다음 원칙을 따른다.

1. `analysis_metric`은 `analysis_result`와 연결한다.
2. 하나의 분석 결과에 여러 지표가 연결될 수 있다.
3. 지표 점수는 의미 있는 범위를 벗어나지 않도록 검증한다.
4. 분석 결과 생성 시 필요한 지표를 함께 저장할 수 있다.
5. 분석 결과가 없는 상태에서 리포트를 생성하지 않는다.

---

## 리포트 처리 원칙

리포트는 분석 결과를 기반으로 생성한다.

구현 시 다음 원칙을 따른다.

1. 리포트는 특정 어르신과 연결된다.
2. 리포트는 특정 분석 결과와 연결될 수 있다.
3. 분석 결과 없이 리포트를 생성해야 하는 요구가 없다면, 분석 결과 기반 생성을 우선한다.
4. 리포트 조회 시 Entity를 직접 반환하지 않는다.
5. 추후 PDF 출력 가능성을 고려하되, 현재 요청 범위를 벗어나면 구현하지 않는다.

---

## 테스트 원칙

가능하면 테스트를 함께 작성한다.

우선순위:

1. Service 단위 테스트
2. Controller 테스트
3. Repository 테스트

테스트가 아직 없는 프로젝트라면, 기존 설정을 확인하고 무리하게 큰 테스트 구조를 만들지 않는다.

테스트에서 확인할 것:

* 정상 생성
* 단건 조회
* 목록 조회
* 수정
* 삭제 또는 비활성화
* 존재하지 않는 ID 조회
* 잘못된 상태 전이
* 연관 데이터 불일치

---

## 실행 및 검증 명령어

작업 후 가능하면 다음 명령어로 확인한다.

```bash
./gradlew test
./gradlew build
```

Docker 관련 작업이 있을 경우:

```bash
docker compose up --build
```

단, 실행 시간이 길거나 환경 변수가 필요한 명령어는 무리해서 실행하지 말고 필요한 설정을 먼저 확인한다.

---

## 코드 수정 규칙

코드를 수정할 때는 다음을 지킨다.

1. 관련 없는 파일은 수정하지 않는다.
2. 포맷팅만 바꾸는 대규모 변경은 하지 않는다.
3. 기능 하나당 변경 범위를 작게 유지한다.
4. 수정 이유를 설명할 수 있어야 한다.
5. 빌드가 깨질 수 있는 변경은 피한다.
6. 기존 API가 있다면 호환성을 고려한다.
7. 사용자가 요청하지 않은 기능을 임의로 추가하지 않는다.
8. 불확실한 설계는 코드로 확정하지 말고 먼저 제안한다.

---

## 금지 사항

다음 행동은 하지 않는다.

1. 사용자 지시 없이 커밋하거나 푸시하지 않는다.
2. 사용자 지시 없이 패키지 구조를 대규모로 바꾸지 않는다.
3. 사용자 지시 없이 DB 스키마를 크게 변경하지 않는다.
4. 사용자 지시 없이 인증/로그인 기능을 추가하지 않는다.
5. 현재 MVP 범위를 벗어난 기능을 임의로 만들지 않는다.
6. Entity를 그대로 API 응답으로 노출하지 않는다.
7. 민감정보나 환경변수 값을 코드에 하드코딩하지 않는다.
8. `todai` 프로젝트명을 다른 이름으로 바꾸지 않는다.
9. RabbitMQ, S3, WebSocket 기능을 사용자가 요청하기 전까지 임의로 구현하지 않는다.
10. 분석 AI/ADK 연동을 사용자가 요청하기 전까지 임의로 구현하지 않는다.

---

## 작업 결과 응답 형식

작업 결과를 설명할 때는 다음 형식을 사용한다.

````md
## 작업 요약

- 무엇을 구현했는지
- 어떤 파일을 수정했는지
- 왜 이렇게 구현했는지

## 주요 변경 사항

1. ...
2. ...
3. ...

## 확인 방법

```bash
./gradlew build
````

## 다음 작업 제안

* ...

````

너무 장황하게 설명하지 말고, 개발자가 바로 확인할 수 있게 정리한다.

---

## 첫 분석 요청을 받았을 때

사용자가 처음 프로젝트 분석을 요청하면, 바로 코드를 수정하지 말고 먼저 다음을 수행한다.

1. 프로젝트 구조 확인
2. Gradle 설정 확인
3. 패키지 구조 확인
4. 현재 구현된 Entity, Controller, Service, Repository 확인
5. Docker/PostgreSQL 설정 확인
6. 앞으로 구현 순서 제안

응답은 다음 형식을 따른다.

```md
## 프로젝트 구조 요약

## 현재 구현 상태

## 확인된 기술 스택

## 구현 우선순위 제안

## 다음에 진행할 작업
````

---
