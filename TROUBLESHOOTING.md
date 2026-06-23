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

## 7. 음성 대답 겹침/누적 (음향 피드백 루프)

- **증상**: 질문엔 잘 답하는데, **이전/다른 대답이 겹쳐 들리고 시간이 갈수록 점점 많아짐**
- **원인**:
  1. 3-2에서 마이크 무음을 고치려고 `getUserMedia`의 **에코 제거(echoCancellation)를 끔** → 스피커로 나온
     토닥이 대답을 **마이크가 되받아 재STT → 또 대답 → 또 스피커...** 음향 피드백 루프로 누적
  2. 재생 코드가 새 대답마다 즉시 `start()`만 해서 **이전 재생과 겹침**
- **해결** (`voice/page.tsx`):
  - **반이중(half-duplex)**: 대답 재생 중엔 `speakingRef`로 **마이크 전송 차단** → 피드백 루프 차단
  - **겹침 방지**: 새 대답 오면 `curSrcRef.stop()`으로 **이전 재생 중지**
  - **잔향 보호**: 재생 종료 후 **350ms** 뒤 마이크 재개
  - 재생 중 상태 "토닥이가 말하고 있어요…" 표시
- **물리적 권장**: 이어폰/헤드셋 착용 시 스피커→마이크 경로 자체가 사라져 가장 확실

---

## 8. 음성 기록이 관리자 화면에 반영 안 됨

- **증상**: 음성 대화가 elder(=박하준, id 5)에 **DB로는 기록되는데** 관리자 일간 화면엔 안 보임
- **진단**: 관리자 일간/주간/월간 조회는 `conversation_session.started_at`의 **날짜 범위**로 세션을 찾는데
  (`findFirstByElderIdAndStartedAtGreaterThanEqual...`), 음성 파이프라인이 만든 세션은
  `ConversationSession.createInternalSession`이 **`started_at = null`, `status = CREATED`** 로 생성 →
  날짜 조회에서 영영 제외됨
- **해결**:
  1. **백엔드**: `createInternalSession`이 `started_at = now()`, `ended_at = now()`, `status = COMPLETED` 를
     채우도록 수정 (음성 파이프라인은 세션 시각을 따로 안 보내므로 생성 시각 사용) — **재시작 필요**
  2. **기존 데이터 백필**: `UPDATE conversation_session SET started_at=created_at, ended_at=created_at,
     session_status='COMPLETED' WHERE started_at IS NULL`
- **부수 정합성**: user 앱의 하드코딩 사용자명 "박하준"과 맞추려 `elder` id=5 의 이름을 **안건호 → 박하준**으로 개명
  (PowerShell→psql 인라인은 한글 인코딩 깨짐 → **UTF-8 `.sql` 파일 + `psql -f`** 로 처리)

---

## 9. 관리자 "대화 기록" 0개 메시지

- **증상**: 박하준 일간 화면에서 감정지수·요약은 나오는데 **"대화 기록 0개의 메시지"**
- **원인**: 화면의 대화 기록은 `conversation_message` 테이블을 읽는데, **음성 파이프라인이
  `analysis_result`(지표)만 저장하고 발화/대답 텍스트를 `conversation_message`에 안 넣었음**.
  (시드 어르신들은 mock 메시지가 있어 보였던 것 / 백엔드엔 메시지 쓰기 API도 없음)
- **해결**: `elder_context.save_messages(session_key, user_text, reply_text)` 추가 — 분석서비스가
  이미 가진 **psycopg2로 `conversation_message`에 직접 저장**(ELDER 발화 + AI 대답, message_order 증가,
  turn_count 갱신). `_fast_reply`에서 매 발화마다 호출. 백엔드 재빌드 불필요.
- **검증**: 더미 발화로 ELDER/AI 2건 정상 저장 확인. **수정 이전 세션은 0개 유지**(AI 대답이 어디에도
  저장 안 돼 백필 불가) → 새로 녹음하면 그 세션부터 대화 기록이 채워짐.

---

## 10. 중복 분석서비스 → 슬로우 트랙 누락 (대화는 저장되는데 분석/연결 누락)

- **증상**: 새 대화를 했는데 관리자에 안 보임. DB를 보니 메시지(`conversation_message`)는 저장됐는데
  해당 세션의 `analysis_result`가 **0건**이고 `conversation_session.elder_id`가 **NULL**
- **원인**: **분석서비스가 또 2개 실행**됨 → 한 발화의 `emotion`은 A 인스턴스, `stt`는 B 인스턴스로
  RabbitMQ 라운드로빈 분배됨 → 슬로우 트랙(`_try_record`)은 **한 프로세스 안에 emotion+stt가 모두**
  있어야 도는데 갈려서 **안 돔** → `/result` 미저장 → 어르신 미연결 + 분석 결과 없음.
  (fast 트랙의 `save_messages`는 stt 받은 인스턴스에서 돌아 메시지만 저장됨)
- **해결**:
  1. **중복 실행 차단 가드** — `analysis_service` 기동 시 `127.0.0.1:8123` 을 잡고, 이미 잡혀 있으면
     `[FATAL]` 출력 후 종료(`_ensure_single_instance`). 2번째 인스턴스가 아예 못 뜸.
  2. 깨진 세션 복구: 이미 메시지가 있는 세션은 `UPDATE conversation_session SET elder_id=5`로 연결
     (단 분석 결과는 슬로우 트랙이 안 돌아 비어 있음 → 완전한 결과는 단일 인스턴스로 재녹음)
- **교훈**: in-memory 집계(`_pending`)에 의존하는 단일 컨슈머 설계는 **중복 실행에 치명적** → 포트 가드로 강제.

---

## 11. 대화 기록 화자가 전부 "말벗 AI"로 표시

- **증상**: 대화 기록이 보이긴 하는데 **어르신 발화까지 전부 "말벗 AI"** 라벨로 나옴
- **원인**: 관리자 프론트가 화자를 고정 문자열로 판별 — `c.name === "어르신" ? "어르신" : "말동무"`.
  그런데 백엔드 `resolveSpeakerName`은 어르신 메시지에 **실제 이름("박하준")**, AI엔 "말벗 AI"를 돌려줌 →
  "어르신"과 안 맞아 전부 "말동무"(=말벗 AI)로 처리됨. (시드 데이터에도 있던 잠재 버그)
- **해결** (`admin .../members/[id]/page.tsx`): 판별을 뒤집어 **"말벗 AI"만 말동무, 나머지는 어르신**으로:
  `speaker: c.name === "말벗 AI" ? "말동무" : "어르신"`

---

## 12. 5지표 분석 402 (크레딧 소진) → Gemini 우회 + 배포본 재배포

- **증상**: `[RECORD][ERROR] 402 insufficient_quota - exceeded your credit quota for this month`. 배포 ADK·로컬 폴백 둘 다 mindlogic 게이트웨이를 써서 막힘. (오늘 테스트로 mindlogic 월 크레딧 소진)
- **원인**: `agent.py`의 분석 LLM 클라이언트가 mindlogic 게이트웨이(`API_KEY`+`BASE_URL`) 사용. 배포된 Cloud Run 에이전트도 내부적으로 동일 → 402.
- **해결 (2단계)**:
  1. **로컬 우회**: `agent.py`가 `USE_GEMINI_DIRECT=1`+`GOOGLE_API_KEY`면 **Gemini 직접 호출**(`https://generativelanguage.googleapis.com/v1beta/openai/`, 모델 `gemini-2.5-flash`). `.env` `USE_REMOTE_ADK=0`로 로컬 분석. → 402 해소.
  2. **배포본 재배포**: 같은 Gemini 설정으로 Cloud Run 재배포 →
     `adk deploy cloud_run --project=gdgsc-499914 --region=asia-northeast3 --service_name=adk-default-service-name --app_name=agent agent -- --no-allow-unauthenticated --quiet --set-env-vars=USE_GEMINI_DIRECT=1,GOOGLE_API_KEY=…,GEMINI_MODEL=gemini-2.5-flash,ROUTING_MODEL=gemini-2.5-flash,GOOGLE_GENAI_USE_VERTEXAI=False`
     (사전: agent 폴더에 `requirements.txt` 복사 필요). 재배포 후 `.env` `USE_REMOTE_ADK=1` + 프록시. 리비전 `…-00008-lxk`.
- **교훈**: 점수가 비정상적으로 낮은 건(5~15) 대부분 **빈 발화("마이크테스트")** 입력 탓. 실제 문장이면 정상(55~95). mindlogic은 셀프충전 UI 없음 → sales@mindlogic.ai.

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
