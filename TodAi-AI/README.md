# SGDS — Korean Dialect STT + AI Health Agent

Whisper-large-v3-turbo + LoRA(8bit)로 한국어 사투리 음성 → 표준어 텍스트 ASR을 학습하고,
wav2vec2로 발화의 음성 감정을 인식하며, Google ADK 기반 AI 에이전트로 고령자 대화의
정신건강 지표를 분석합니다. (STT·감정 인식은 미들웨어에서 병렬 수행되어 에이전트에 종합 전달)

## 모델

HuggingFace Hub에 공개되어 있습니다.

**STT (사투리 → 표준어):** [siyeonsung/whisper-korean-dialect](https://huggingface.co/siyeonsung/whisper-korean-dialect)
- 베이스 모델: `openai/whisper-large-v3-turbo`
- 학습 데이터: AI Hub 139-1 한국어 방언 데이터 (train 142만 / val 19만 / test 17만 샘플)
- 학습: LoRA (r=32, alpha=64) + 8bit 양자화, 10 epoch

**음성 감정 인식 (6-class):** [HyukII/todai-emotion-wav2vec2](https://huggingface.co/HyukII/todai-emotion-wav2vec2)
- 베이스 모델: `kresnik/wav2vec2-large-xlsr-korean` (약 315.7M)
- 학습 데이터: AI Hub 한국어 감정 음성 (60대+ 화자 중심)
- 라벨: 기쁨 / 놀라움 / 두려움 / 사랑스러움 / 슬픔 / 화남
- 검증: 화자 분리 홀드아웃 macro-F1 0.44 (SVM 베이스라인 0.41 대비), top-2 0.66

### 모델 업로드

```powershell
# HuggingFace CLI 설치
powershell -ExecutionPolicy ByPass -c "irm https://hf.co/cli/install.ps1 | iex"

# 로그인
hf auth login

# 업로드 (merged-epoch10 폴더 안에서 실행)
hf upload siyeonsung/whisper-korean-dialect .
```

## 프로젝트 구조

```
sgds/
├── stt_model/                      # Whisper 사투리 파인튜닝 파이프라인
│   ├── whisper_dialect_finetune.py # 메인 학습 스크립트 (LoRA + 8bit)
│   ├── infer.py                    # DialectTranscriber — 파이프라인이 import하는 실시간 STT 추론 진입점
│   ├── prepare_data.py             # 원천 데이터 → utterance 단위 청크 + JSONL 매니페스트 생성
│   ├── extract_zips.py             # AI Hub 139-1 zip 파일 일괄 추출
│   ├── make_full_manifest.py       # 기존 청크로 매니페스트 재구성
│   ├── make_val_small.py           # val.jsonl → val_small.jsonl (2000샘플 다운샘플)
│   ├── subsample_manifests.py      # 화자 단위 서브샘플링
│   ├── merge_epochs.py             # LoRA 어댑터 → 베이스 모델 병합
│   ├── quick_infer.py              # 학습 중간 빠른 추론 확인 (5~10샘플)
│   └── evaluate_test.py            # 전체 테스트셋 CER / WER 평가
├── emotion_model/                  # 음성 감정 인식 (wav2vec2, 6-class)
│   ├── infer.py                    # EmotionRecognizer — 미들웨어/에이전트가 import하는 추론 진입점
│   ├── quick_infer.py              # CLI 빠른 추론 확인
│   ├── finetune_wav2vec2.py        # 파인튜닝 (화자 분리 홀드아웃 검증)
│   └── upload_to_hf.py             # 학습 모델 → HF Hub 업로드
├── ai_agent/                       # 정신건강 분석 에이전트
│   ├── agent/
│   │   ├── agent.py                # Google ADK + LiteLLM (gemini-2.5-flash) 기반 분석 엔진
│   │   └── __init__.py
│   └── test_agent.py               # 에이전트 통합 테스트
├── pipeline/                       # ★ 실시간 음성 케어 파이프라인 (미들웨어 뒤단 Python 워커)
│   ├── analysis_service.py         # 오케스트레이터: emotion·STT 워커 + fast 대답 + slow ADK 기록
│   ├── reply_llm.py                # 말벗 '토닥이' 대답 생성 (로컬 Ollama, 누적지표 주입)
│   ├── reply_service.py            # 프론트 채팅용 FastAPI (:8100, POST /api/chat)
│   ├── elder_context.py            # 어르신 누적 지표 조회 → 대답 컨텍스트 (피드백 루프)
│   ├── tts.py                      # 로컬 한국어 TTS (facebook/mms-tts-kor, GPU)
│   ├── adk_remote.py               # 배포된 ADK 멀티에이전트(Cloud Run) 호출 클라이언트
│   └── ws_audio_client.py          # WS 발화 송신 + 대답 수신 E2E 테스트 클라이언트
├── data/
│   ├── Training/                   # AI Hub 139-1 원천 zip (학습)
│   ├── Validation/                 # AI Hub 139-1 원천 zip (검증)
│   ├── extracted/                  # 압축 해제된 JSON + 오디오
│   └── processed/
│       ├── chunks/                 # 30초 이하 오디오 청크
│       └── manifests/              # train / val / val_small / test .jsonl
├── outputs/                        # 학습 체크포인트 (로컬 전용, git 제외)
│                                   # 최종 모델은 HF Hub에 업로드됨
├── requirements.txt
├── .env                            # GEMINI_API_KEY 등 환경 변수
└── .python-version                 # Python 3.11
```

## 환경

- Windows 11 / RTX 4090 (24GB)
- Python 3.11
- CUDA 12.1+

## 설치

```powershell
# venv
python -m venv venv
.\venv\Scripts\Activate.ps1

# PyTorch (CUDA 12.1)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# 그 외 패키지
pip install -r requirements.txt
```

---

## STT 모델 파이프라인

### 0. 데이터 준비

AI Hub 139-1 데이터셋 zip을 `data/Training/`, `data/Validation/`에 배치 후:

```powershell
# zip 추출
python stt_model/extract_zips.py

# utterance 단위 청크 생성 + JSONL 매니페스트 생성
python stt_model/prepare_data.py
```

기존 청크가 있고 매니페스트만 재구성할 경우:

```powershell
python stt_model/make_full_manifest.py
```

val.jsonl을 2000샘플로 줄일 때:

```powershell
python stt_model/make_val_small.py
```

### 1. 학습 시작

```powershell
.\venv\Scripts\Activate.ps1

python stt_model/whisper_dialect_finetune.py train `
  --train_files data/processed/manifests/train.jsonl `
  --eval_files data/processed/manifests/val_small.jsonl `
  --output_dir outputs/whisper-dialect-epoch10 `
  --per_device_train_batch_size 8 `
  --gradient_accumulation_steps 4 `
  --learning_rate 1e-3 `
  --num_train_epochs 10 `
  --save_strategy epoch `
  --eval_strategy epoch `
  --save_total_limit 10 `
  --logging_steps 50 `
  --no_save_merged
```

체크포인트에서 재개할 경우 `--resume` 추가.

학습 완료 후 LoRA 가중치 병합:

```powershell
python stt_model/merge_epochs.py
```

결과는 `outputs/whisper-dialect-epoch10/merged-epoch{N}/` 에 저장됨.

### 2. 빠른 결과 확인

```powershell
# test.jsonl에서 랜덤 5개 샘플 추론
python stt_model/quick_infer.py

# 샘플 수 지정
python stt_model/quick_infer.py --n 10

# 특정 모델 경로 지정 (로컬 또는 HF Hub ID)
python stt_model/quick_infer.py --model_dir siyeonsung/whisper-korean-dialect

# 특정 wav 파일 하나
python stt_model/quick_infer.py --audio "your_audio.wav"
```

출력 예시:
```
[1] chunk0000.wav
  방언 원문: 거 있는 기라 아이가
  정답(표준): 거기 있는 거 아닌가
  모델 출력: 거기 있는 거 아닌가
```

### 3. 실제 모델 평가 (CER / WER)

전체 테스트셋 기준 정량 평가. 수 시간 소요.

```powershell
python stt_model/evaluate_test.py --model_dir siyeonsung/whisper-korean-dialect
```

결과는 `outputs/eval_epoch10/eval_results.json` 에 저장됨.

```json
{"n_samples": 5000, "cer": 8.23, "wer": 15.41}
```

중단 후 이어서 실행하려면 `--resume` 추가.

코드에서 직접 모델 불러올 때:

```python
import torch
from transformers import WhisperForConditionalGeneration, WhisperProcessor

processor = WhisperProcessor.from_pretrained("siyeonsung/whisper-korean-dialect")
model = WhisperForConditionalGeneration.from_pretrained(
    "siyeonsung/whisper-korean-dialect",
    dtype=torch.float16,
    device_map="auto",
)
```

---

## 음성 감정 모델 (wav2vec2)

`emotion_model/`은 `kresnik/wav2vec2-large-xlsr-korean`을 6개 감정(기쁨/놀라움/두려움/사랑스러움/슬픔/화남)으로
파인튜닝한 모델입니다. 미들웨어에서 STT와 **병렬로** 실행되어, 발화 텍스트와 함께 '음성 감정' 신호를
에이전트(`analyze_mental_health`의 `emotion` 인자)로 전달합니다.

모델은 HF Hub([HyukII/todai-emotion-wav2vec2](https://huggingface.co/HyukII/todai-emotion-wav2vec2))에 있으며,
`from_pretrained`로 자동 다운로드됩니다. **private repo이므로 `HF_TOKEN` 환경변수 또는 `hf auth login`이 필요합니다.**

### 코드에서 사용 (미들웨어 워커 등 장기 실행 프로세스)

```python
from emotion_model.infer import EmotionRecognizer

rec = EmotionRecognizer()              # ★ 프로세스 시작 시 1회만 (모델 1.2GB 로드)
out = rec.predict("utterance.wav")     # 메시지마다 호출
# {
#   "emotion": "슬픔", "emotion_en": "Sadness", "confidence": 0.62,
#   "probabilities": {"기쁨":0.05, "놀라움":0.08, "두려움":0.10,
#                     "사랑스러움":0.05, "슬픔":0.62, "화남":0.10}
# }
```

`out["probabilities"]`(또는 `emotion`)를 에이전트의 `emotion` 인자(JSON 문자열)로 그대로 넘기면 됩니다 —
에이전트는 emotion을 프롬프트 컨텍스트로 소비하므로 고정 스키마 변환이 필요 없습니다.

> 8초 초과 클립은 8초 창(50% 겹침)으로 분할해 창별 확률을 평균합니다.
> GPU가 없으면 자동으로 CPU 추론(클립당 1~3초). 전처리(mono·16kHz·attention_mask·0.1초 패딩)는 학습과 동일합니다.

### 빠른 확인 (CLI)

```powershell
# 폴더 일괄 (하위 폴더 재귀) — '영화_감정' 폴더면 정답 비교/정확도 출력
python emotion_model/quick_infer.py --audio_dir demo/clips

# 단일 파일
python emotion_model/quick_infer.py --audio sample.wav
```

### 재학습 / 업로드

```powershell
# 학습 (감정 코퍼스 경로는 EMO_DATA_ROOT 환경변수로 지정)
python emotion_model/finetune_wav2vec2.py

# HF Hub 업로드
python emotion_model/upload_to_hf.py HyukII/todai-emotion-wav2vec2
```

---

## AI 에이전트 (정신건강 분석)

`ai_agent/agent/agent.py`는 Google ADK + LiteLLM(gemini-2.5-flash)을 사용해 고령자 대화 세션에서
다섯 가지 정신건강 지표(사회적 고립, 인지 부하, 감정 변동, 일상 활력, 건강 불안)를 0~100 점수로 산출합니다.

에이전트는 Google Cloud Run에 배포되어 있습니다. 서버를 별도로 켤 필요 없이 요청 시 자동으로 실행됩니다.

### Cloud Run API 호출

**Base URL**
```
https://adk-default-service-name-879430197170.asia-northeast3.run.app
```

**인증**

Cloud Run은 ID 토큰 인증을 사용합니다. `gcloud` CLI가 필요합니다.

```powershell
# gcloud 설치 후 로그인
gcloud auth login

# 요청마다 ID 토큰 발급
$TOKEN = gcloud auth print-identity-token
```

**호출 순서 (2단계)**

1단계 — 세션 생성:
```powershell
$BASE = "https://adk-default-service-name-879430197170.asia-northeast3.run.app"
$USER_ID = "user_001"
$SESSION_ID = "session_001"

Invoke-RestMethod `
  -Method Post `
  -Uri "$BASE/apps/agent/users/$USER_ID/sessions/$SESSION_ID" `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -ContentType "application/json" `
  -Body "{}"
```

2단계 — 분석 요청:
```powershell
$body = @{
    app_name   = "agent"
    user_id    = $USER_ID
    session_id = $SESSION_ID
    new_message = @{
        role    = "user"
        parts   = @(@{
            text = (@{
                session_id           = $SESSION_ID
                text                 = "오늘도 혼자 밥 먹었어. 아무도 연락이 없더라고."
                emotion              = '{"sadness":0.6,"anxiety":0.3,"neutral":0.1,"joy":0.0}'
                conversation_history = "[]"
            } | ConvertTo-Json -Compress)
        })
    }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Method Post `
  -Uri "$BASE/run" `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -ContentType "application/json" `
  -Body $body
```

**응답 파싱**

응답은 이벤트 배열입니다. 마지막 `model` 이벤트의 `content.parts[].text`를 JSON으로 파싱하면 분석 결과가 나옵니다.

```json
{
  "session_id": "session_001",
  "scores": {
    "social_isolation": 35,
    "cognitive_load": 72,
    "emotional_fluctuation": 48,
    "daily_vitality": 30,
    "health_anxiety": 55
  },
  "mode": "single"
}
```

점수는 0~100 정수. 높을수록 건강한 상태입니다.

---

### 로컬 실행 (개발용)

`.env` 파일에 API 키를 설정:

```env
GEMINI_API_KEY=your_key_here
API_KEY=your_mindlogic_key
BASE_URL=https://your-gateway-url
```

```python
from ai_agent.agent.agent import analyze_mental_health

result = analyze_mental_health(
    session_id="session_001",
    text="오늘도 혼자 밥 먹었어. 아무도 연락이 없더라고.",
    emotion='{"sadness": 0.6, "anxiety": 0.3, "neutral": 0.1, "joy": 0.0}',
    conversation_history="[]",
)
```

통합 테스트:

```powershell
python ai_agent/test_agent.py
```

---

## 실시간 음성 케어 파이프라인 (`pipeline/`)

학습한 STT·감정 모델과 배포된 ADK 에이전트를 묶어, **음성 발화 1건이 들어오면 즉시 말벗 대답을
음성으로 돌려주는 동시에(정서 분석으로) 어르신 지표를 누적**하는 실시간 파이프라인입니다.
Go 미들웨어(VAD·WebSocket·RabbitMQ)와 Spring 백엔드 뒤에서 도는 Python 워커 묶음입니다.

### 아키텍처 — fast/slow 이중 트랙 + 피드백 루프

```
마이크 → WS → 미들웨어(VAD) → RabbitMQ
  ├─ FAST  : STT → 말벗 대답(누적지표 반영) → TTS → user-reply 큐 → 미들웨어 → WS → 사용자(음성+자막)
  └─ SLOW  : 음성감정(6-cat) + ADK 5지표 분석 → 백엔드 → PostgreSQL ──┐
                                                                     └→ 다음 대답의 컨텍스트로 환류(피드백 루프)
```

- **FAST 트랙** `analysis_service._fast_reply`: STT 도착 즉시 `reply_llm.generate_reply`로 대답을
  만들고(어르신 누적 지표를 시스템 프롬프트에 주입), `tts.py`로 음성 합성해 `todai.user.reply` 큐로 보냄.
  미들웨어가 session_id로 라우팅해 WS로 사용자에게 음성+자막 전달.
- **SLOW 트랙** `analysis_service._try_record`: 같은 발화의 감정+STT가 모이면 ADK로 5지표 분석 후
  백엔드 내부 API에 기록. 분석 결과는 `elder_context.py`가 되읽어 다음 대답에 반영(피드백 루프).
- 정상 동작 시 **steady-state 지연 ≈ 3~4초** (STT 0.4s + LLM ~3s + TTS 0.3s, 모델 warm 기준).
  프로세스 첫 호출엔 모델 로딩(whisper·mms-tts)으로 수십 초 → 데모 전 1회 워밍 권장.

### 구성 요소 · 포트

| 서비스 | 포트 | 역할 |
|--------|:---:|------|
| `analysis_service.py` | — | emotion·STT 워커 + fast 대답/TTS + slow ADK 기록 (RabbitMQ 소비) |
| `reply_service.py` | 8100 | 프론트 텍스트 채팅용 `POST /api/chat` (FastAPI) |
| Ollama (말벗 LLM 런타임) | 11434 | `exaone3.5:7.8b` (한국어) — `ollama pull exaone3.5:7.8b` |
| RabbitMQ | 5672 | 워커 큐 (`todai.worker.emotion/stt`, `todai.reply`, `todai.user.reply`) |
| ADK 인증 프록시 | 8081 | 배포 Cloud Run 멀티에이전트 호출용 (아래 참조) |

> 전체 스택 기동·검증 절차(미들웨어·백엔드·프론트 포함)는 저장소 루트의 **`PROJECT_TEST.md`** 참조.

### 환경변수 (분석서비스)

| 변수 | 기본 | 의미 |
|------|:---:|------|
| `USE_REAL_STT` | 0 | 1이면 학습 Whisper(GPU), 0이면 mock 텍스트 |
| `USE_REAL_EMOTION` | 0 | 1이면 wav2vec2 감정모델(HF_TOKEN 필요), 0이면 mock |
| `USE_REPLY_LLM` | 1 | STT 후 말벗 대답 생성(Ollama) |
| `USE_TTS` | 1 | 대답을 음성(TTS)으로도 전달 |
| `USE_REMOTE_ADK` | 1 | 1이면 배포 ADK 멀티에이전트 호출, 0이면 로컬 `analyze_mental_health` |
| `ADK_LOCAL_FALLBACK` | 1 | 원격 ADK 실패 시 로컬 분석으로 폴백 |
| `DEMO_ELDER_ID` | (자동) | 기록을 연결할 어르신 id (미설정 시 `/api/main` 첫 어르신) |

### 배포 ADK 멀티에이전트 호출 (`adk_remote.py`)

SLOW 트랙은 기본적으로 **배포된 Cloud Run 멀티에이전트**(`agent.py`의 다중 전문가 토론판)를 호출합니다.
비공개 서비스라 Google ID 토큰이 필요한데, 로컬에선 **gcloud 프록시**가 가장 간단합니다:

```powershell
# 최초 1회
gcloud auth login
gcloud config set project gdgsc-499914
gcloud components install cloud-run-proxy

# 프록시 기동 (이 창은 떠 있어야 함 — 프록시가 인증을 주입)
gcloud run services proxy adk-default-service-name --region asia-northeast3 --port 8081
#  -> ai_agent/.env 의 ADK_BASE_URL=http://localhost:8081 이면 토큰 없이 호출됨
```

`adk_remote.analyze_remote()`가 세션 생성 → `/run` → 응답 이벤트에서 5지표를 추출합니다(툴의
`functionResponse.response.scores` 또는 최종 텍스트의 `analyze_mental_health_response.scores`를 재귀 탐색).
프록시가 꺼져 있으면 `ADK_LOCAL_FALLBACK=1`로 로컬 분석에 자동 폴백하므로 파이프라인은 멈추지 않습니다.
운영(Spring)에서는 run.invoker 서비스계정으로 google-auth가 ID 토큰을 자동 발급합니다.

### 단독 실행

```powershell
# 분석서비스 (실 STT + 말벗 + TTS + 배포 ADK)
$env:USE_REAL_STT="1"
.\venv\Scripts\python.exe -u pipeline\analysis_service.py

# 프론트 채팅용 대답 서비스
.\venv\Scripts\python.exe -u pipeline\reply_service.py

# E2E 테스트: 발화 1건 흘려보내고 대답 수신 (reply_out.wav 저장)
.\venv\Scripts\python.exe -u pipeline\ws_audio_client.py --wav 발화.wav
```

---

## 학습 데이터 형식

JSONL. 각 row는 `audio` (파일경로) + `transcription` (사투리 텍스트) + `standard` (표준어 텍스트).

```jsonl
{"audio": "data/processed/chunks/utt_0001.wav", "transcription": "밥 묵었나", "standard": "밥 먹었니"}
{"audio": "data/processed/chunks/utt_0002.wav", "transcription": "어데 갔다 왔노", "standard": "어디 갔다 왔니"}
```

각 샘플은 30초 이하여야 함 (그 이상은 자동 필터됨).

## 데이터 검증 규칙

`filter_invalid()`이 자동 필터:
- 빈 라벨 / null
- 0 길이 오디오
- 0.1초 미만
- 30초 초과

## LoRA 설정

기본값: `r=32`, `alpha=64`, `target_modules=["q_proj", "v_proj"]`, 8bit.
사투리 음향 차이가 크면 `["q_proj","k_proj","v_proj","out_proj"]`로 늘리는 것을 고려.
