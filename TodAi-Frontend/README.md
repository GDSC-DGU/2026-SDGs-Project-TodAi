# 🗣️ 말동무 AI

> **AI 기반 노인 정서 케어 및 복지사 관리 솔루션**
> **"혼자가 아니라는 것을 매일 느낄 수 있도록."**

독거 노인의 정서적 고립을 예방하는 AI 말벗 서비스 **말동무(Maldonmu)**

---

# 📖 목차

* [프로젝트 개요](#-프로젝트-개요-overview)
* [프로젝트 배경](#-프로젝트-배경-background)
* [프로젝트 목표](#-프로젝트-목표-goal)
* [주요 기능](#-주요-기능-features)
* [팀원](#-팀원-team)
* [기술 스택](#-기술-스택-tech-stack)
* [프로젝트 구조](#-프로젝트-구조-structure)
* [조직 구성도](#-조직-구성도-organization)
* [설치 및 실행 방법](#-설치-및-실행방법-getting-started)

---

# 📌 프로젝트 개요 (Overview)

### 프로젝트명

**말동무 (Maldonmu)**

### 프로젝트 소개

말동무는 AI 기반 노인 말벗 서비스와 복지사 관리 대시보드를 결합한 통합 돌봄 플랫폼입니다.

어르신과의 일상 대화를 AI가 지속적으로 분석하여 정서 상태와 위험 신호를 감지하고, 복지사는 대시보드를 통해 우선 관리가 필요한 대상자를 빠르게 파악할 수 있습니다.

단순한 안부 확인을 넘어, **고독사 예방과 정서적 돌봄의 사전 개입**을 목표로 합니다.

---

## 🌍 Google Solution Challenge

본 프로젝트는 **Google Solution Challenge** 출품작으로, Google 기술을 활용하여 UN SDGs 달성에 기여합니다.

| SDG    | 목표                                                  |
| ------ | --------------------------------------------------- |
| SDG 3  | Good Health and Well-Being (건강과 웰빙)                 |
| SDG 10 | Reduced Inequalities (불평등 감소)                       |
| SDG 11 | Sustainable Cities and Communities (지속 가능한 도시와 공동체) |

---

# 🏚️ 프로젝트 배경 (Background)

## 보이지 않는 곳에서 일어나는 위기

2024년 한 해 동안 **3,924명**이 홀로 사망한 채 발견되었습니다.

그러나 복지 종사자가 현장을 최초 발견한 비율은 **7.7%**에 불과하며, 상당수는 임대인이나 경비원에 의해 사후 발견됩니다.

현재의 복지 시스템은 위기를 예방하기보다, 발생 이후 대응하는 구조에 가깝습니다.

---

## 📡 복지 시스템의 구조적 한계

담당 복지사 한 명이 수십 명의 독거 노인을 관리하는 환경에서, 월 1회 수준의 안부 확인만으로는 정서적 변화를 파악하기 어렵습니다.

독거노인의 우울 증상 유병률은 노인 부부 가구 대비 두 배 이상 높지만, 이를 실시간으로 확인할 수 있는 도구는 부족합니다.

효돌, 효진이 등 AI 돌봄 기기가 일부 보급되고 있으나,

* 보급 비용 문제
* 제한된 공급 범위
* 복지사 연동 부족
* 대화 데이터 활용 한계

등의 문제가 존재합니다.

---

## 💡 말동무의 해결책

말동무는 단순한 AI 말벗 서비스를 넘어,

* 대화 데이터 수집
* 감정 및 정서 분석
* 위험도 산출
* 복지사 대시보드 연동

을 통해 **사전 예방형 복지 시스템**을 구축합니다.

---

# 🎯 프로젝트 목표 (Goal)

### 1. 고독사 예방

일상 대화 속 사회적 고립 및 심리적 위기 신호를 조기에 탐지합니다.

### 2. 복지 자원 효율화

복지사가 우선 방문해야 할 대상을 데이터 기반으로 선정할 수 있도록 지원합니다.

### 3. 사회적 연결 회복

AI 말벗이 지속적인 소통 창구가 되어 정서적 안정감을 제공합니다.

### 4. 디지털 접근성 향상

음성 중심 인터페이스를 통해 디지털 기기에 익숙하지 않은 어르신도 쉽게 사용할 수 있습니다.

---

# ✨ 주요 기능 (Features)

## 🧓 노인용 음성 대화 앱

### AI 말벗 대화

* 자연스러운 음성 기반 대화
* 24시간 이용 가능
* 정서적 안정감 제공
* 대화 이력 기반 개인화 응답

### 접근성 중심 UI

* 큰 글씨
* 단순한 화면 구조
* 최소한의 조작 방식
* 고령층 친화적 UX

### 사투리 → 표준어 변환

지역 방언을 표준어로 변환하여 분석 정확도를 향상합니다.

---

## 👩‍💼 복지사 관리 대시보드

### 담당 노인 목록 관리

* 담당 어르신 현황 조회
* 최근 활동 상태 확인
* 위험도 순 정렬

### 감정 분석 리포트

대화 데이터를 기반으로 5가지 지표를 분석합니다.

| 지표     | 설명                |
| ------ | ----------------- |
| 사회적 고립 | 사회적 관계 및 연결 수준    |
| 건강 불안  | 건강 관련 걱정 정도       |
| 일상 활력  | 생활 의욕 및 활동성       |
| 감정 변동  | 감정 기복 및 불안정성      |
| 인지 부하  | 기억력 및 인지 기능 저하 징후 |

### 기간별 분석

* 일별 분석
* 주별 분석
* 월별 분석

감정 변화 추이를 시각화하여 장기적인 상태를 확인할 수 있습니다.

### 위기 감지 및 방문 우선순위 추천

AI가 위험 점수를 분석하여 복지사의 방문 우선순위를 제안합니다.

---

# 👥 팀원 (Team)

| 이름  | 역할                 | GitHub       |
| --- | ------------------ | ------------ |
| 서은정 | PM · AI · Frontend | 추후 추가        |
| 성시연 | Backend            | 추후 추가        |
| 이재혁 | Backend            | 추후 추가        |
| 장주희 | UI/UX · Design     | @elliejang32 |
| 최희수 | AI · Data          | 추후 추가        |

---

# 🛠️ 기술 스택 (Tech Stack)

## Language

* TypeScript
* JavaScript
* Python

## Frontend

* React
* Next.js
* Tailwind CSS

## Backend

* Spring Boot
* MySQL
* Redis

## AI / ML

* Gemini API
* STT (Speech-to-Text)
* TTS (Text-to-Speech)
* Sentiment Analysis
* Dialect Normalization

## Collaboration

| Tool   | Usage             |
| ------ | ----------------- |
| Git    | Version Control   |
| GitHub | Source Management |
| Notion | Documentation     |
| Figma  | UI/UX Design      |

---

# 📂 프로젝트 구조 (Structure)

```bash
maldonmu/
│
├── frontend/
│   ├── senior-app/
│   └── worker-dashboard/
│
├── backend/
│   ├── api-server/
│   ├── auth-server/
│   └── analytics-server/
│
├── ai/
│   ├── emotion-analysis/
│   ├── dialect-normalization/
│   └── risk-prediction/
│
├── docs/
│
└── README.md
```
todai/
├── apps/
│   ├── admin/      사회복지사용 관리 대시보드 (Next.js, :3000)
│   └── user/       어르신용 말동무 앱 "토닥" (Next.js PWA, :3001)
└── packages/
    └── api/        @todai/api — 백엔드 API 타입 · fetch 클라이언트 (앱 공유)
```

## 시작하기

---

# 🏗️ 조직 구성도 (Organization)

## Architecture

```text
[Senior App]
      │
      ▼
 Speech Input
      │
      ▼
 STT Engine
      │
      ▼
 Gemini AI
      │
      ▼
 Emotion Analysis
      │
      ▼
 Risk Scoring
      │
      ▼
 Database
      │
      ▼
 Social Worker Dashboard
```

### Frontend

* 노인용 음성 대화 앱
* 복지사 관리 대시보드

### Backend

* 사용자 관리
* 대화 기록 저장
* 분석 결과 제공 API

### AI

* 음성 인식(STT)
* 감정 분석
* 위험도 예측
* 사투리 정규화

---

# 🚀 설치 및 실행방법 (Getting Started)

## Prerequisites

```bash
Node.js >= 18.x
npm >= 9.x
```

---

## 1. 레포지토리 클론

```bash
git clone https://github.com/your-org/maldonmu.git

cd maldonmu
```

---

## 2. 패키지 설치

```bash
npm install

# 또는

yarn install
```

---

## 3. 환경 변수 설정

```bash
cp .env.example .env
```

`.env`

```env
GEMINI_API_KEY=your_api_key_here
DATABASE_URL=your_database_url_here
```

---

## 4. 개발 서버 실행

```bash
npm run dev
```

---

# 📈 기대 효과

* 독거노인의 정서적 고립 완화
* 고독사 예방을 위한 조기 위험 감지
* 복지사의 업무 효율 향상
* 데이터 기반 복지 의사결정 지원
* 지속 가능한 지역사회 돌봄 체계 구축

---

# 📄 License

본 프로젝트는 Google Solution Challenge 출품을 목적으로 개발되었습니다.

License 정보는 추후 추가될 예정입니다.
