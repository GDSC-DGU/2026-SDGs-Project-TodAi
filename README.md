# 🗣️ 토닥이

### AI 기반 노인 정서 케어 및 복지사 관리 솔루션

> **"혼자가 아니라는 것을 매일 느낄 수 있도록."**
>
> 독거 노인의 정서적 고립을 예방하는 AI 말벗 서비스, **토닥이**

<br/>

## 목차

1. [프로젝트 개요 (Overview)](#1-project-overview-프로젝트-개요)
2. [프로젝트 배경 (Background)](#2-project-background-프로젝트-배경)
3. [프로젝트 목표 (Goal)](#3-project-goal-프로젝트-목표)
4. [주요 기능 (Features)](#4-key-features-주요-기능)
5. [팀원 (Team)](#5-team-members-팀원)
6. [기술 스택 (Tech Stack)](#6-technology-stack-기술-스택)
7. [프로젝트 구조 (Structure)](#7-project-structure-프로젝트-구조)
8. [조직 구성도 (Organization)](#8-organization-조직-구성도)
9. [설치 및 실행방법 (Getting Started)](#9-getting-started-설치-및-실행방법)

<br/>

# 1. Project Overview (프로젝트 개요)

- **프로젝트 이름**: 토닥이
- **프로젝트 설명**: AI 기반 노인 말벗 & 복지사 관리 대시보드 서비스. 매일 어르신과 나누는 대화를 분석해 고독사를 예방하고, 복지사가 고위험 어르신을 선제적으로 파악할 수 있도록 돕습니다.

> 🎯 본 프로젝트는 **Google Solution Challenge** 출품작으로, Google의 기술을 활용하여 UN SDGs 달성에 기여합니다.

| SDG | 목표 |
|-----|------|
| **SDG 3** | Good Health and Well-Being (건강과 웰빙) |
| **SDG 10** | Reduced Inequalities (불평등 감소) |
| **SDG 11** | Sustainable Cities and Communities (지속 가능한 도시와 공동체) |

<br/>

# 2. Project Background (프로젝트 배경)

### 🏚️ 보이지 않는 곳에서 일어나는 위기

2024년 한 해 동안 3,924명이 홀로 사망한 채 발견되었습니다. (전년 대비 7.2% 증가, 보건복지부 2025.11)
그러나 복지 종사자가 현장을 최초 발견한 비율은 7.7%에 불과하며, 절반 가까이는 임대인·경비원에 의해 사후 발견됩니다.
시스템이 위기를 예방하는 것이 아니라, 죽음을 수습하는 데 그치고 있습니다.

### 📡 복지 시스템의 구조적 한계

담당 복지사 한 명이 수십 명의 독거 노인을 관리하는 구조에서, 월 1회 안부 확인이 사실상 전부입니다.
독거노인의 우울증상 유병률은 16.1%로 노인 부부 가구(7.8%)의 두 배를 넘지만 _(보건복지부 노인실태조사 2023)_,
복지사가 정서 변화를 실시간으로 파악할 수 있는 수단이 없습니다.

효돌·효진이 등 AI 돌봄 로봇이 일부 지자체에 보급되어 있으나, 모든 저소득층에게 균등히 닿지 못합니다.
더 근본적으로는, 대화를 분석하거나 복지사가 이를 기반으로 사전 개입할 수 있는 연동 구조 자체가 없습니다.

### 💡 토닥이의 해결책

토닥이 서비스는 기존 말벗 AI 서비스와는 다르게 어르신의 일상 대화를 AI로 누적·분석해 감정 상태를 정량화하고,
복지사가 대시보드로 실시간 추적하며 위기 전에 선제 개입할 수 있도록 설계된
**복지사 연동형 사전 예방 시스템**입니다.

<br/>

# 3. Project Goal (프로젝트 목표)

AI 말벗과의 일상 대화를 통해 어르신의 정서 상태를 지속적으로 모니터링하고,
복지사가 데이터 기반으로 돌봄 우선순위를 파악할 수 있는 통합 노인 복지 플랫폼을 구축합니다.

- **고독사 예방**: 일상 대화 분석을 통해 사회적 고립·심리적 위기 징후를 조기에 감지
- **복지 자원 효율화**: 복지사가 고위험 어르신을 우선 파악하고 방문 계획을 수립할 수 있도록 지원
- **사회적 연결 회복**: AI 말벗이 어르신의 일상 소통 창구가 되어 정서적 안정감 제공
- **디지털 접근성 확보**: 음성 기반 UI로 스마트 기기에 익숙하지 않은 어르신도 이용 가능

<br/>

# 4. Key Features (주요 기능)

## 🧓 노인용 음성 대화 앱 (Senior Voice Chat App)

- **AI 말벗 대화**
  - 언제든 말을 걸 수 있는 AI 음성 대화 인터페이스를 제공합니다.
  - 자연스러운 일상 대화를 통해 정서적 고립감을 완화합니다.

- **접근성 중심 UI**
  - 큰 글씨, 단순한 화면 구성으로 디지털 기기에 익숙하지 않은 노인도 쉽게 사용할 수 있습니다.

- **사투리 → 표준어 변환**
  - 노년층·지방 거주 어르신의 대화를 정확하게 이해하기 위해 사투리 → 표준어 분석 기능을 통해 대화 내용 분석도를 높였습니다.

<br/>

## 👩‍💼 복지사 관리 대시보드 (Social Worker Dashboard)

- **담당 노인 목록 관리**
  - 담당 노인의 전체 목록과 최근 상태를 한눈에 파악할 수 있습니다.

- **감정 분석 리포트**
  - 대화 데이터를 기반으로 5가지 지표를 분석하여 시각화합니다.

    | 지표 | 설명 |
    |------|------|
    | 사회적 고립 (Social Isolation) | 대인 관계 및 사회적 연결 수준 |
    | 건강 불안 (Health Anxiety) | 신체 건강에 대한 걱정 정도 |
    | 일상 활력 (Daily Vitality) | 일상생활의 활동성·활력 수준 |
    | 감정 변동 (Emotional Variation) | 감정의 기복 및 불안정성 |
    | 인지 부하 (Cognitive Decline) | 인지·기억 기능 저하 징후 |

- **일별 / 주별 / 월별 분석 탭**
  - 기간별 감정 추이를 그래프로 확인하고 변화 패턴을 추적합니다.

- **위기 감지 및 방문 우선순위 제안**
  - 분석 점수 기반으로 위험도가 높은 노인을 분석하여 우선 방문 대상을 결정하는 데 도움을 줍니다.

<br/>

# 5. Team Members (팀원)

| 이름 | 포지션 | GitHub |
|:----:|:----:|:----:|
| 이재혁 | PM · AI · Backend | [GitHub](https://github.com/Hyuk-II) |
| 서은정 | Frontend | [GitHub](https://github.com/enunsnv) |
| 성시연 | AI · Backend | [GitHub](https://github.com/siyeonsung) |
| 장주희 | UI/UX · Docs| [@elliejang32](https://github.com/elliejang32) |
| 최희수 | Backend | [GitHub](https://github.com/chlgmltn) |

<br/>

# 6. Technology Stack (기술 스택)

## 6.1 Language

| 영역 | 언어 |
|------|------|
| Frontend | TypeScript |
| Backend | Java 17 |
| Middleware | Go 1.21 |
| AI / ML | Python |

<br/>

## 6.2 Frontend

| 구분 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) · React 19 |
| 언어 | TypeScript 5 |
| 스타일링 | Tailwind CSS 4 |
| 구조 | npm workspaces 모노레포 — `apps/user`(노인 음성앱) · `apps/admin`(복지사 대시보드) · `packages/api`(공용 API 클라이언트) |
| 실시간 | WebSocket(PCM 16kHz 스트리밍) · Web Audio API |

<br/>

## 6.3 Backend

| 구분 | 기술 |
|------|------|
| 프레임워크 | Spring Boot 3.5 |
| 언어 | Java 17 |
| 데이터 | Spring Data JPA · PostgreSQL(운영) · H2(테스트/데모) |
| API 문서 | springdoc-openapi (Swagger UI) |
| 역할 | 회원·세션·대화·분석결과 관리, 내부 분석결과 수집 API |

<br/>

## 6.4 AI / ML

| 구분 | 기술 / 모델 |
|------|------|
| STT (사투리→표준어) | Whisper-large-v3-turbo + LoRA(8bit) — [`siyeonsung/whisper-korean-dialect`](https://huggingface.co/siyeonsung/whisper-korean-dialect) |
| 음성 감정 (6-class) | wav2vec2 — [`HyukII/todai-emotion-wav2vec2`](https://huggingface.co/HyukII/todai-emotion-wav2vec2) |
| **정신건강 5지표 분석** | **Google ADK 멀티에이전트 + Gemini**(`gemini-2.5-flash`), **Google Cloud Run** 배포 |
| 말벗 대화 생성 | LLM (Ollama · EXAONE 3.5) |
| 음성 합성 (TTS) | MMS-TTS (`facebook/mms-tts-kor`) |
| 런타임 | PyTorch · Hugging Face Transformers · pika(RabbitMQ 워커) |

> 🟦 **활용 Google 기술**: Gemini · Google ADK(Agent Development Kit) · Google Cloud Run

<br/>

## 6.5 Middleware

| 구분 | 기술 |
|------|------|
| 언어 | Go 1.21 |
| 웹 / 실시간 | Gin · Gorilla WebSocket |
| 메시지 큐 | RabbitMQ (`amqp091-go`) |
| 역할 | 음성 스트림 수신·VAD 발화 분할, Fast/Slow 트랙 오케스트레이션 |

<br/>

## 6.6 Cooperation

| 도구 | 용도 |
|--|--|
| Git | 버전 관리 |
| Notion | 문서 및 일정 관리 |
| Figma | UI/UX 디자인 |

<br/>

# 7. Project Structure (프로젝트 구조)

토닥이는 역할별로 분리된 **4개의 서비스**로 구성됩니다.

```
TodAi/
├── TodAi-Frontend/        # 🖥️ Next.js 모노레포 (노인앱 + 복지사 대시보드)
│   ├── apps/
│   │   ├── user/          #   노인용 음성 대화 앱 (:3001)
│   │   └── admin/         #   복지사 관리 대시보드 (:3000)
│   └── packages/api/      #   공용 API 클라이언트·타입
│
├── TodAi-Backend/         # ⚙️ Spring Boot — 회원/세션/대화/분석결과 API (:8080)
│   └── src/main/java/com/solchall/todai/
│       ├── domain/        #   엔티티 (어르신·세션·대화·분석결과·지표)
│       └── api/           #   공개 API + 내부(internal) 분석결과 수집 API
│
├── TodAi-MiddleWare/      # 🔀 Go — 실시간 음성 오케스트레이션 (:8090)
│   └── internal/
│       ├── websocket/     #   PCM 스트림 수신
│       ├── vad/           #   발화 경계 감지(VAD)
│       └── orchestrator/  #   Fast/Slow 트랙 + RabbitMQ 발행
│
└── TodAi-AI/              # 🧠 Python — AI 파이프라인
    ├── stt_model/         #   Whisper 사투리 STT (파인튜닝·추론)
    ├── emotion_model/     #   wav2vec2 음성 감정 인식
    ├── ai_agent/          #   Google ADK + Gemini 정신건강 분석 에이전트
    └── pipeline/          #   ★ 실시간 워커 (STT·감정·5지표·말벗·TTS)
```

<br/>

# 8. Organization (조직 구성도)

<!-- <p align="center">
  <img src="docs/images/architecture.png" width="700"/>
</p> -->

### 🔄 데이터 흐름 (실시간 음성 케어 파이프라인)

```
                                          ┌──────────── Fast Track (즉시 응답) ───────────┐
                                          │                                              ▼
 🧓 어르신                                  │                                      🔊 말벗 음성 답변
   │ 음성                                   │                                              │
   ▼                                       │   STT → 말벗 LLM → TTS                        │
┌─────────────┐  WS/PCM   ┌──────────────┐ │  ┌──────────────────────┐                    │
│  Frontend   │──────────▶│  Middleware  │─┼─▶│        AI (Python)     │────────────────────┘
│  (노인 음성앱) │          │   (Go·VAD)    │ │  │  STT·감정·5지표·말벗·TTS  │
└─────────────┘           └──────────────┘ │  └──────────┬───────────┘
       ▲                       RabbitMQ     │             │ Slow Track (5지표 정신건강 분석)
       │                                    └─────────────┘             │
       │ 대시보드 조회                                                    ▼
┌─────────────┐           ┌──────────────┐                    ┌──────────────────┐
│  Frontend   │◀──────────│   Backend     │◀───────────────────│  분석결과 저장 API  │
│ (복지사 대시보드)│   조회 API │ (Spring·DB)    │      결과 기록       └──────────────────┘
└─────────────┘           └──────────────┘
       ▲
       │
   👩‍💼 복지사 (위기 조기 발견 · 방문 우선순위)
```

- **Frontend** (Next.js): 노인용 음성 대화 앱 + 복지사 관리 대시보드
- **Middleware** (Go): 실시간 음성 스트림 수신·VAD 발화 분할, Fast/Slow 트랙 오케스트레이션
- **AI** (Python): STT · 음성 감정 · 정신건강 5지표(ADK+Gemini) · 말벗 대화 · TTS
- **Backend** (Spring Boot): 회원·세션·대화·분석결과 관리 및 DB, 대시보드 조회 API

<br/>

# 9. Getting Started (설치 및 실행방법)

토닥이는 4개 서비스로 구성되며, 각 서비스를 함께 실행해야 전체 음성 케어 파이프라인이 동작합니다.

### 사전 요구사항 (Prerequisites)

```
Node.js >= 18 / npm >= 9        # Frontend
Java 17                         # Backend
Go >= 1.21                      # Middleware
Python >= 3.10                  # AI
PostgreSQL 15+ · RabbitMQ 3.x   # 데이터 / 메시지 큐
(선택) Ollama · NVIDIA GPU       # 말벗 LLM / AI 모델 가속
```

### 1. 레포지토리 클론

```bash
git clone https://github.com/<your-org>/TodAi-Frontend.git
git clone https://github.com/<your-org>/TodAi-Backend.git
git clone https://github.com/<your-org>/TodAi-MiddleWare.git
git clone https://github.com/<your-org>/TodAi-AI.git
```

### 2. 서비스별 실행

```bash
# Frontend (노인앱 :3001 / 복지사 대시보드 :3000)
cd TodAi-Frontend && npm install
npm run dev:user      # 노인 음성앱
npm run dev:admin     # 복지사 대시보드

# Backend (:8080)
cd TodAi-Backend && ./gradlew bootRun

# Middleware (:8090)
cd TodAi-MiddleWare && go run ./cmd/server

# AI 파이프라인 (RabbitMQ 워커)
cd TodAi-AI && python -m venv venv && ./venv/Scripts/pip install -r requirements.txt
python pipeline/analysis_service.py
```

### 3. 환경 변수 설정

각 서비스의 `.env`에 필요한 값을 설정합니다. (AI 에이전트 예시)

```env
GOOGLE_API_KEY=your_gemini_api_key     # Gemini
HF_TOKEN=your_huggingface_token        # 음성 감정 모델(private)
USE_REMOTE_ADK=1                       # 배포된 ADK 멀티에이전트 사용
```