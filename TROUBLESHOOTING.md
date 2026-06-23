# 토닥이(TodAi) 음성 파이프라인 트러블슈팅 정리

배포 ADK 연동 → 음성 E2E 동작까지 겪은 문제와 해결을 정리한 문서. 진단은 대부분
**미들웨어/분석서비스 로그 + PostgreSQL 직접 조회**로 수행했다.

> 전체 흐름: 배포 ADK 연동 → gcloud 프록시 구축 → 응답 파싱 버그 → "음성 답변 안 옴"을
> 단계별로 파고들어 **마이크 캡처 버그 → 지연 → 중복 인스턴스 → 2건의 크래시**까지 순차 해결.

---

## 1. 배포 ADK 멀티에이전트 연동

| | 내용 |
|---|---|
| 목표 | 로컬 분석 대신 배포된 Cloud Run 멀티에이전트 사용 |
| 장애물 | 비공개 서비스(HTTP 403) → 매 요청에 Google ID 토큰 필요 |
| 해결 | gcloud 무권한 설치(winget) → `gcloud auth login` → `cloud-run-proxy` 컴포넌트 설치 → `gcloud run services proxy ... --port 8081` (프록시가 인증 주입). `adk_remote.py`는 `ADK_BASE_URL`이 localhost면 Authorization 헤더 생략 |

---

## 2. ADK 응답 파싱 실패

- **증상**: `/run`은 200 OK인데 "5지표 JSON 을 찾지 못함"
- **진단**: 원시 응답 덤프 → 점수가 두 곳에 **래퍼 키로 중첩**돼 있었음
  - 툴 결과: `functionResponse.response.scores`
  - 최종 텍스트: ```{"analyze_mental_health_response": {"scores": {...}}}```
- **해결**: `adk_remote._extract_scores`를 **재귀 탐색 + functionResponse 우선**으로 보강

---

## 3. "음성 답변 안 옴" — 다층 원인 분해

진단 출발점: 분석서비스 로그에 **발화가 0건 도달**. 테스트 클라이언트(`ws_audio_client.py`)로
서버 파이프라인은 정상 확인 → 문제를 **브라우저 쪽**으로 좁힘.

### 3-1. 중복 분석서비스
- **원인**: 같은 RabbitMQ 큐를 2개 인스턴스가 라운드로빈으로 나눠 먹음 (반복 기동)
- **해결**: 하나로 통합 (이후에도 반복 재발 → 매번 정리 필요)

### 3-2. 브라우저 마이크 무음 (핵심 버그)
- **진단**: 미들웨어 로그에 `audio chunk received`는 오는데 `VAD rms=0.0` (101회 전부) → 디지털 무음.
  음성 페이지에 **마이크 입력 레벨 미터**를 추가해 브라우저 캡처 자체가 0임을 확인.
- **근본 원인 2가지**:
  1. `getUserMedia({audio:true})`의 기본 **DSP(echoCancellation/noiseSuppression/autoGainControl)**가
     Razer 무선 헤드셋에서 무음 스트림 반환 → **DSP 끄기**로 해결 ★ 결정타
  2. `MediaStreamAudioSourceNode`를 ref에 보관하지 않아 **GC로 끊김** → `srcRef`로 보관(+zero-gain sink로 하울링 방지)
- **결과**: "마이크 입력 94" — 캡처 성공, VAD `rms=98.0` → utterance 정상 감지

### 3-3. "안건호에 반영 안 됨" (오해 규명)
- **진단**: DB 조회 → `analysis_job.elder_id`는 비었지만 `analysis_result.elder_id=5`,
  `conversation_session.elder_id=5`로 **정상 연결**
- **결론**: 관리자 화면은 `conversation_session → elder` 경로로 조회하므로 `job.elder_id` 공백은 **표시에 무관**.
  진짜 원인은 3-2(발화가 서버에 도달하지 않음)였음

---

## 4. 대답 지연 (10~20초)

- **진단**: 단계별 타이밍 로그 추가 후 측정
  - 첫 발화: whisper·mms-tts **모델 로딩**으로 수십 초 (일회성)
  - 워밍 후: STT 0.4s + LLM ~3s + TTS 0.3s ≈ **3.6초**
  - STT는 28초 오디오도 0.4초(turbo) → 발화 길이 거의 무관. 지연 대부분은 **모델 로딩 + LLM 생성**
- **해결**: 데모 전 **모델 워밍**(더미 발화 1회) + 대답 길이 단축(`reply_llm` `max_tokens` 200→110 + 간결 지시)

---

## 5. "2번째 답변부터 안 옴"

- **진단**: 미들웨어 로그 `user reply delivery skipped | session_id=... not found`
- **원인**: **중복 인스턴스** → 2번째 발화가 "차가운"(모델 미로드) 인스턴스로 라우팅 → 55초 지연 →
  그 사이 **WS가 끊겨** 대답이 버려짐 (= 첫 답변만 오고 둘째는 유실)
- **해결**: 단일 인스턴스 + 워밍 → 모든 발화가 빠르게 처리되어 **WS가 끊기기 전에 대답 도착**

---

## 6. 반복 크래시 — 서로 다른 두 버그

처리 도중 분석서비스가 자꾸 죽던 문제. 원인이 **두 개**였다.

| # | 에러 | 근본 원인 | 해결 |
|---|------|-----------|------|
| 1 | `pika.StreamLostError` (ConnectionReset 10054) | SLOW 트랙의 **ADK 호출이 ~70초 동기 블로킹** → 단일 pika 연결이 멈춰 RabbitMQ가 연결을 리셋 | SLOW 트랙(ADK 분석+기록)을 **백그라운드 스레드** `_record_worker`로 분리 (스레드는 pika 미접촉, HTTP만 → 안전) |
| 2 | `UnicodeEncodeError: 'cp949' codec ... 'ᄒ'` | **한글 대답/STT를 cp949 콘솔에 `print`** → 일부 자모(ᄒ)에서 인코딩 실패로 콜백 사망 | **stdout/stderr를 UTF-8(+replace)로 강제** + 기동 시 `PYTHONIOENCODING=utf-8` |

> heartbeat=0도 시도했으나 1번엔 부족 — **스레드 분리**가 정답.
> 2번이 마지막 런을 죽인 범인, 1번은 그 이전 런들을 죽이던 범인.

---

## 코드 변경 요약

**TodAi-AI**
- `pipeline/adk_remote.py` (신규) — 배포 ADK 호출 + 재귀 점수 추출
- `pipeline/analysis_service.py` — 원격 ADK+폴백, **SLOW 트랙 스레드화**, **stdout UTF-8**, 단계 타이밍 로그
- `pipeline/reply_llm.py` — `max_tokens` 200→110 + 간결 지시
- `ai_agent/.env` — `ADK_*` 설정/인증 가이드(gitignore)

**TodAi-Frontend** — `apps/user/app/voice/page.tsx`
- `getUserMedia` **DSP 끄기**(헤드셋 무음 해결) ★
- 소스 노드 `srcRef` 보관(GC 방지) + zero-gain sink
- 마이크 입력 레벨 미터(진단)

---

## 핵심 교훈

1. **로그가 답** — 미들웨어 `VAD rms`, 분석서비스 단계 타이밍, DB 직접 조회가 매 단계 원인을 정확히 지목
2. **무선 헤드셋 + getUserMedia 기본 DSP = 무음** 함정 → 처리 비활성화
3. **블로킹 작업(수십 초 ADK)은 pika 콜백 밖으로** — 메시지 루프를 막으면 연결이 리셋됨
4. **Windows에서 한글 출력 = stdout UTF-8 필수** (안 하면 특정 자모에서 프로세스 사망)
5. **중복 컨슈머 금지** — 큐가 갈려 콜드 인스턴스로 새는 문제 반복

---

## 재발 방지 운영 수칙

- 분석서비스는 **단일 인스턴스만** 기동 (직접 중복 실행 금지)
- 기동 후 **더미 발화 1회로 워밍** (whisper·mms-tts 로드)
- ADK 프록시(:8081)는 **계속 떠 있어야** 원격 호출 가능 (꺼지면 `ADK_LOCAL_FALLBACK=1`로 자동 폴백)
- 기동 시 `PYTHONIOENCODING=utf-8` 권장
- 전체 스택 기동·검증 절차는 `PROJECT_TEST.md` 참조
