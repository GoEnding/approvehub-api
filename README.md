# ApproveHub API

> 사내 문서 기안 · 결재 · 반려 및 상태 이력 관리를 위한 업무시스템형 백엔드 포트폴리오

ERP / SI / 업무시스템 개발 직무 지원을 위해 제작한 백엔드 API 프로젝트입니다.  
화려한 기능보다 **실무에서 자주 마주치는 인증 정책, 권한 분리, 상태 전이, 감사 이력** 구조를 명확하게 구현하는 데 집중했습니다.

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | NestJS (Node.js + TypeScript) |
| ORM | TypeORM |
| Database | MySQL |
| 인증 | JWT (Access Token + Refresh Token) |
| 패키지 매니저 | pnpm |
| API 문서 | Swagger (OpenAPI) |
| 암호화 | bcrypt |
| 유효성 검증 | class-validator, class-transformer |

---

## 핵심 구현 포인트

### 1. 단일 세션 기반 JWT 인증 (`tokenVersion`)

일반적인 JWT 구현에서 발급된 토큰은 만료 전까지 서버에서 취소할 방법이 없습니다.  
이 프로젝트는 `users.tokenVersion` 컬럼을 활용해 이 문제를 해결합니다.

```
로그인  → tokenVersion += 1 → 새 토큰에 tokenVersion 포함
재로그인 → tokenVersion += 1 → 이전 토큰의 tokenVersion 불일치 → 모든 이전 세션 무효화
로그아웃 → tokenVersion += 1 + refreshTokenHash = null
```

모든 보호 API 요청 시 `JwtAuthGuard`가 `payload.tokenVersion === DB.tokenVersion`을 검증합니다.  
이를 통해 로그아웃 이후 탈취된 Access Token도 즉시 차단됩니다.

### 2. Refresh Token 보안 저장

Refresh Token 원본은 서버에 저장하지 않습니다.  
`bcrypt.hash(refreshToken)` 값만 DB에 저장하고, 검증 시 `bcrypt.compare`로 비교합니다.  
DB가 유출되더라도 Refresh Token 원본을 알 수 없습니다.

### 3. 문서 상태 전이 규칙

상태를 직접 수정하는 방식이 아닌 **전용 엔드포인트**로 전이를 관리합니다.  
각 전이마다 권한 검증 + 타임스탬프 갱신 + 이력 저장이 자동으로 실행됩니다.

```
DRAFT ──[submit]──► PENDING_APPROVAL ──[approve]──► APPROVED
                           │
                        [reject]
                           │
                           ▼
                        REJECTED
```

| 전이 | 허용 조건 |
|------|-----------|
| DRAFT → PENDING_APPROVAL | 문서 작성자 본인, 승인자 지정 필수 |
| PENDING_APPROVAL → APPROVED | 문서에 지정된 승인자 본인 |
| PENDING_APPROVAL → REJECTED | 문서에 지정된 승인자 본인, 사유 필수 |

### 4. 상태 이력 관리 (Audit Log)

모든 상태 변경은 `document_status_histories` 테이블에 자동 기록됩니다.  
`fromStatus`, `toStatus`, 변경자, 변경 시각, 코멘트를 저장하여 분쟁 및 감사에 대응합니다.

### 5. Soft Delete

사용자와 문서 모두 `deletedAt` 컬럼으로 소프트 딜리트를 구현합니다.  
실수로 삭제된 데이터를 복구할 수 있으며, 기존 이력과의 참조 무결성이 유지됩니다.

---

## 프로젝트 구조

```
src/
├── auth/                   # 인증 도메인
│   ├── dto/                # register, login, refresh, logout DTO
│   ├── guards/             # JwtAuthGuard
│   ├── interfaces/         # JWT payload 타입
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/                  # 사용자 도메인
│   ├── dto/                # UserProfileDto
│   ├── entities/           # User 엔티티
│   ├── users.controller.ts # GET /users/me
│   ├── users.service.ts
│   └── users.module.ts
├── documents/              # 문서 도메인 (핵심)
│   ├── dto/                # CRUD + 상태전이 + 이력 DTO
│   ├── entities/           # Document, DocumentStatusHistory 엔티티
│   ├── documents.controller.ts
│   ├── documents.service.ts
│   └── documents.module.ts
└── common/
    ├── decorators/         # @CurrentUser()
    ├── enums/              # UserRole, DocumentStatus
    └── interceptors/       # DateTransformInterceptor
```

---

## DB 스키마

### users

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | int | PK |
| loginId | varchar | 로그인 아이디 (unique) |
| password | varchar | bcrypt 해시 |
| name | varchar | 이름 |
| email | varchar | 이메일 (unique) |
| phoneNumber | varchar | 전화번호 (unique, nullable) |
| department | varchar | 부서 (nullable) |
| jobTitle | varchar | 직책 (nullable) |
| role | enum | USER \| ADMIN |
| **tokenVersion** | int | 세션 무효화 카운터 |
| **refreshTokenHash** | varchar | Refresh Token bcrypt 해시 |
| lastLoginAt | datetime | 마지막 로그인 시각 |
| deletedAt | datetime | Soft delete |

### documents

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | int | PK |
| title | varchar | 문서 제목 |
| content | text | 문서 본문 |
| requesterId | int(FK) | 작성자 |
| approverId | int(FK) | 승인자 (nullable) |
| status | enum | DRAFT \| PENDING_APPROVAL \| APPROVED \| REJECTED \| CANCELED |
| submittedAt | datetime | 결재 요청 시각 |
| approvedAt | datetime | 승인 시각 |
| rejectedAt | datetime | 반려 시각 |
| rejectionReason | varchar | 반려 사유 |
| deletedAt | datetime | Soft delete |

### document_status_histories

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | int | PK |
| documentId | int(FK) | 문서 참조 |
| fromStatus | enum | 이전 상태 (nullable) |
| toStatus | enum | 변경된 상태 |
| changedById | int(FK) | 변경 사용자 |
| comment | varchar | 코멘트 / 반려 사유 |
| createdAt | datetime | 변경 시각 (불변, 수정/삭제 없음) |

---

## API 엔드포인트

### Auth

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/auth/register` | 회원가입 | ✗ |
| POST | `/api/auth/login` | 로그인 | ✗ |
| POST | `/api/auth/refresh` | Access Token 재발급 | ✗ |
| POST | `/api/auth/logout` | 로그아웃 | ✅ |

### Users

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/api/users/me` | 내 정보 조회 | ✅ |

### Documents

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/api/documents?type=mine\|inbox\|processed` | 문서 목록 | ✅ |
| GET | `/api/documents/:id` | 문서 상세 | ✅ |
| POST | `/api/documents` | 문서 작성 (DRAFT) | ✅ |
| PATCH | `/api/documents/:id` | 문서 수정 (DRAFT만) | ✅ |
| PATCH | `/api/documents/:id/submit` | 결재 요청 | ✅ |
| PATCH | `/api/documents/:id/approve` | 승인 | ✅ |
| PATCH | `/api/documents/:id/reject` | 반려 (사유 필수) | ✅ |
| GET | `/api/documents/:id/histories` | 상태 이력 조회 | ✅ |

---

## 실행 방법

### 사전 요구사항
- Node.js 18+
- MySQL 8.0+
- pnpm

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/YOUR_USERNAME/approvehub-api.git
cd approvehub-api

# 2. 의존성 설치
pnpm install

# 3. 환경변수 설정
cp .env.example .env
# .env 파일을 열어 DB 정보 및 JWT 시크릿 입력

# 4. MySQL에서 데이터베이스 생성
CREATE DATABASE approvehub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 5. 서버 실행 (개발 모드 - 자동 테이블 생성)
pnpm start:dev
```

### Swagger UI

서버 실행 후 아래 주소에서 API를 테스트할 수 있습니다.

```
http://localhost:3000/docs
```

---

## 인증 흐름

```
1. POST /api/auth/login
   → { accessToken, refreshToken } 반환

2. 보호 API 요청 시
   → Header: Authorization: Bearer <accessToken>

3. Access Token 만료 시
   → POST /api/auth/refresh  Body: { refreshToken }
   → 새 accessToken 반환

4. 로그아웃
   → POST /api/auth/logout (Authorization 헤더 필요)
   → refreshTokenHash = null, tokenVersion += 1
   → 이전 발급 토큰 전체 무효화
```

---

## 환경변수

`.env.example` 파일을 참고하세요.

| 변수 | 설명 |
|------|------|
| `DB_HOST` | MySQL 호스트 |
| `DB_PORT` | MySQL 포트 (기본: 3306) |
| `DB_USERNAME` | DB 사용자명 |
| `DB_PASSWORD` | DB 비밀번호 |
| `DB_DATABASE` | DB 이름 (approvehub) |
| `JWT_ACCESS_SECRET` | Access Token 서명 키 |
| `JWT_REFRESH_SECRET` | Refresh Token 서명 키 (별도 키 필수) |
| `JWT_ACCESS_EXPIRES_IN` | Access Token 유효기간 (예: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh Token 유효기간 (예: `7d`) |
