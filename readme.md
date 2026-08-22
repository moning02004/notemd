# note.md — 쓰고, 찾고, 나눠 쓰는 마크다운 노트

> "그때 정리해둔 그 내용, 어디에 적었더라?"
>
> 노트를 쓰는 것만큼 다시 찾아내는 것이 중요하다는 생각에서 출발한 셀프호스팅 노트 서비스.
> 전문 검색, 편집 이력, 휴지통 보관 정책, 본문 암호화, 워크스페이스 단위 공유까지 직접 설계해 붙였다.
> 개인이 혼자 쓰거나 소규모 팀이 서버 하나 띄워 쓰는 것을 전제로 한다.

<p>
  <img alt="Python" src="https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white">
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white">
  <img alt="SQLAlchemy" src="https://img.shields.io/badge/SQLAlchemy-D71F00?logo=sqlalchemy&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white">
  <img alt="Meilisearch" src="https://img.shields.io/badge/Meilisearch-FF5CAA?logo=meilisearch&logoColor=white">
  <img alt="Celery" src="https://img.shields.io/badge/Celery-37814A?logo=celery&logoColor=white">
  <img alt="Redis" src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white">
</p>
<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white">
  <img alt="Tiptap" src="https://img.shields.io/badge/Tiptap-3-000000?logo=tiptap&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white">
</p>

---

## 1. 왜 만들었나

노트 앱은 많지만, 쌓인 노트를 다시 꺼내 쓰는 단계에서 아쉬운 점이 반복됐다.
"쓰기"보다 "찾기와 지키기"에 무게를 두고 필요한 기능을 하나씩 붙여나간 결과물.

| 흔한 문제 | note.md의 해결 |
| --- | --- |
| 제목으로만 검색돼서 본문에 묻힌 내용을 못 찾음 | Meilisearch 전문 검색. 저장·삭제·복구 때마다 색인을 맞추고, 검색 범위는 사용자 단위로 격리 |
| 실수로 덮어쓴 내용을 되돌릴 방법이 없음 | 노트 스냅샷. 수동 / 하루 첫 편집 / 매 편집 중에서 생성 시점을 사용자가 선택 |
| 지운 노트가 즉시 사라지거나, 반대로 영원히 쌓임 | 휴지통으로 먼저 이동. 15일 / 30일 / 보관 안 함 중 고른 정책에 따라 매일 자정 자동 정리 |
| 민감한 내용도 DB에 평문으로 저장됨 | 사용자별 데이터 키로 본문을 봉투 암호화. 노트별 열람 비밀번호도 별도 지원 |
| 공유하려면 계정을 통째로 넘기거나 링크만 던져야 함 | 워크스페이스에 멤버와 노트를 묶어 공유. 공개 링크는 비밀번호로 잠글 수 있음 |

---

## 2. 주요 기능

| 기능 | 설명 |
| --- | --- |
| 에디터 | Tiptap 기반 WYSIWYG. 표, 체크리스트, 토글, 코드블록(14개 언어 하이라이팅·복사 버튼), 이미지 드래그&드롭 업로드 |
| 자동 저장 | 바뀐 필드만 골라 PATCH 전송. 본문·제목은 타이핑이 멈춘 뒤 500ms, 설정 변경은 즉시 반영 |
| 검색 | Meilisearch 전문 검색. 태그·정렬·20개 단위 페이지네이션, 카드/리스트 보기 전환 |
| 스냅샷 | 편집 이력 저장·복원·삭제. 공유 중인 노트는 정책과 무관하게 편집마다 기록 |
| 휴지통 | 소프트 삭제와 복구. 보관 기간 만료분은 Celery Beat 가 매일 자정(KST) 영구 삭제 |
| 공유 | 워크스페이스 단위 공유(멤버는 편집 가능), 공개 링크 열람, 노트별 비밀번호 |
| 암호화 | 노트 본문·비밀번호를 사용자별 데이터 키로 AES-GCM 암호화 |
| 템플릿 | 자주 쓰는 형식을 저장해 새 노트의 시작점으로 사용 |
| 가져오기 | PDF(텍스트 추출), 마크다운, 코드 파일 업로드 → 노트로 변환. 코드는 확장자에 맞는 코드블록으로 감쌈 |
| 내보내기 | 목록에서 Markdown 다운로드(1개는 `.md`, 여러 개는 zip), 노트 설정에서 PDF 내보내기 |
| 계정 | 최초 가입자가 관리자, 이후 계정은 관리자가 발급. 액세스 토큰 15분 + 리프레시 토큰 14일 |
| 그 외 | PWA 매니페스트, 편집 영역 너비 조절(100/70/50%), 다중 선택 후 일괄 다운로드·삭제 |

---

## 3. 기술 스택

| 분류 | 기술 |
| --- | --- |
| 백엔드 | Python 3.13, FastAPI, SQLAlchemy, Alembic, Pydantic |
| 데이터 | PostgreSQL 16, Meilisearch 1.45, Redis 7 |
| 비동기 작업 | Celery 5.3 (worker + beat) |
| 문서 처리 | WeasyPrint(PDF 내보내기), PyMuPDF(PDF 업로드 텍스트 추출), markdown / markdownify |
| 보안 | PyJWT, cryptography(AES-GCM), bcrypt |
| 프론트엔드 | Next.js 16(App Router), React 19, TypeScript, Tailwind CSS 4 |
| 에디터 | Tiptap 3, lowlight / highlight.js |
| 상태 관리 | TanStack Query, Zustand |
| 실행 환경 | Docker Compose(서비스 7개), Gunicorn + Uvicorn |
| 배포 | GitHub Actions — 릴리스 발행 시 백엔드·프론트엔드 이미지를 Docker Hub 에 푸시 |
| 공통 골격 | [fastapi-clean-archi](https://github.com/moning02004/fastapi-clean-archi) — 직접 만들어 PyPI 에 공개한 라이브러리 |

---

## 4. 실행

### 4-1. 한 번에 띄우기

Docker 와 Docker Compose 만 있으면 된다.

```bash
git clone https://github.com/moning02004/notemd.git
cd notemd
make up-build
```

프론트엔드·백엔드·PostgreSQL·Meilisearch·Redis·Celery 워커/비트가 함께 올라온다.

| 주소 | 용도 |
| --- | --- |
| http://localhost:3000 | 웹 |
| http://localhost:8002 | API |
| http://localhost:8002/docs | Swagger 문서 |
| http://localhost:7700 | Meilisearch |

> 저장소에 포함된 `docker-compose.local.yaml` 의 키 값은 로컬 개발 전용. 배포 시 반드시 교체 필요.

### 4-2. 자주 쓰는 명령

| 명령 | 동작 |
| --- | --- |
| `make up` | 빌드 없이 기동 |
| `make up-build` | 이미지 빌드 후 기동 |
| `make down` | 전체 중지 |
| `make downv` | 볼륨까지 삭제 (데이터 전부 사라짐, 확인 후 진행) |
| `make logs LOG_SERVICE=backend` | 특정 서비스 로그 확인 |
| `make ps` | 컨테이너 상태 확인 |
| `make test` | 백엔드 테스트 실행 |
| `make migrate` / `make makemigrations` | Alembic 마이그레이션 적용 / 생성 |
| `make add_module` | 모듈 4계층 골격 생성 |
| `make fe-rebuild` | 프론트 의존성 변경 시 익명 볼륨까지 새로 만들어 재빌드 |

### 4-3. 첫 계정

최초 가입자가 관리자가 된다. 이후 계정은 관리자가 발급하며, 발급된 계정의 초기 비밀번호는 `0000`.
공개 가입 창구가 없는 셀프호스팅 전제이므로, 서버를 띄운 뒤 첫 계정을 먼저 만들어 둘 것.

---

## 5. 개발 환경

백엔드 컨테이너는 소스를 바인드 마운트하고 `uvicorn --reload` 로 뜨므로, 코드를 고치면 그대로 반영된다.
프론트엔드도 `next dev` 로 동작한다.

| 작업 | 명령 |
| --- | --- |
| 백엔드 테스트 | `make test` (in-memory SQLite 사용, 운영 DB 미접근) |
| 모듈 단위 테스트 | `make test TEST_ARGS="note"` (파일까지 지정하려면 `TEST_ARGS="note test_download"`) |
| 데이터 백필 | `make backfill SCRIPT=backfill_init_preference` |
| 마이그레이션 이력 | `make db-history` |

PDF 내보내기는 WeasyPrint 가 시스템 라이브러리(`libpango`)와 한글 폰트를 필요로 한다.
둘 다 백엔드 이미지에 포함돼 있어 컨테이너에서는 별도 작업이 없지만,
컨테이너 밖 가상환경에서 직접 실행하려면 호스트에 pango 설치가 필요하다.

---

## 6. 설계 노트

| 주제 | 선택과 이유 |
| --- | --- |
| 모듈 구조 | 도메인 7개(note·tag·template·workspace·preference·search·user)를 각각 `domain / application / infrastructure / interfaces` 4계층으로 분리. 반복되는 골격은 별도 라이브러리로 떼어내 관리 커맨드 한 줄로 새 모듈을 생성 |
| 본문 암호화 | 환경변수 KEK 로 사용자별 데이터 키(DEK)를 AES-GCM 으로 감싸 DB 에 보관하고, 본문은 그 DEK 로 암호화. AAD 에 사용자 식별자를 묶어 다른 사용자의 암호문을 가져와 복호화하는 경로를 차단하고, 키 교체를 대비해 KEK 버전을 함께 기록. 서버가 복호화하므로 종단간 암호화는 아니며 DB 유출 대비가 목적 |
| 토큰 | 액세스 토큰은 헤더(15분), 리프레시 토큰은 HttpOnly 쿠키(14일). 401 을 받으면 재발급 후 원래 요청을 재시도하되, 여러 요청이 동시에 401 을 받아도 진행 중인 재발급을 공유해 호출은 한 번만 발생. 토큰 없이 보낸 공개 노트 요청의 401 은 재발급 대상에서 제외 |
| 식별자 | 외부로 나가는 리소스 ID 는 auto increment 값 대신 별도 해시 ID 사용 |
| 자동 저장 | 직전 저장분과 비교해 바뀐 필드만 PATCH. 본문·제목은 디바운스로 묶고, 설정 토글은 즉시 전송해 반응성과 요청 수를 함께 관리 |
| 검색 색인 | 인덱스 설정(검색 대상 필드, 필터·정렬 필드, 오타 보정 비활성)을 앱 기동 시 코드로 보장 |
| 스냅샷 정책 | 매 편집마다 남기면 이력이 금세 불어나고, 수동만 두면 정작 필요할 때 없음. 사용자가 정책을 고르게 하되 공유 중인 노트는 편집마다 강제로 남겨 누가 언제 고쳤는지 추적 |
| 휴지통 정리 | 보관 기간은 사용자 설정값을 따르고, 만료분 정리는 Celery Beat 로 매일 자정에 일괄 처리. 삭제 시점에 즉시 지우지 않아 복구 여지를 확보 |
| PDF 폰트 | 본문 폰트를 Noto Sans CJK 로 두니 19MB 폰트를 렌더링마다 서브셋하느라 짧은 노트 한 장에 4~6초, 결과물 234KB. 4MB 대의 나눔바른고딕을 앞에 두고 Noto 를 폴백으로만 남겨 169ms / 5.8KB 로 단축. 나눔이 한글·가나·상용 한자를 담고 있어 대부분의 노트는 폴백까지 가지 않음 |
| 파일 저장소 | `Storage` 인터페이스를 두고 로컬 디스크 구현을 주입. 현재 구현체는 로컬 하나 |

---

## 7. API

`Authorization: Bearer <access_token>` 헤더로 인증한다. 공개 노트 조회만 토큰 없이 접근 가능.

### 7-1. 인증

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/check` | 초기 설치 여부(사용자 존재 여부) 확인 |
| POST | `/auth/obtain-token` | 로그인. 액세스 토큰 반환 + 리프레시 토큰 쿠키 설정 |
| POST | `/auth/refresh-token` | 쿠키의 리프레시 토큰으로 액세스 토큰 재발급 |
| DELETE | `/auth/token` | 로그아웃. 리프레시 토큰 쿠키 삭제 |

### 7-2. 사용자

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/users` | 사용자 목록 |
| POST | `/users` | 계정 생성. 최초 1회는 관리자 계정, 이후는 관리자가 발급 |
| GET | `/users/{user_hash}` | 사용자 정보 |
| GET | `/users/{user_hash}/workspaces` | 사용자가 속한 워크스페이스 |
| PATCH | `/users/change-password` | 비밀번호 변경 |
| DELETE | `/users/{user_hash}` | 계정 삭제 |

### 7-3. 노트

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/notes` | 목록. `keyword` `tag` `sort` `page` `is_deleted` 쿼리 지원 |
| POST | `/notes` | 빈 노트 생성 |
| GET | `/notes/{note_hash}` | 상세 조회 |
| POST | `/notes/{note_hash}` | 비밀번호가 걸린 노트 조회 |
| PATCH | `/notes/{note_hash}` | 수정 (부분 갱신) |
| DELETE | `/notes/{note_hash}` | 휴지통으로 이동 |
| DELETE | `/notes/{note_hash}/permanently` | 영구 삭제 |
| PATCH | `/notes/{note_hash}/restore` | 휴지통에서 복구 |
| DELETE · PATCH | `/notes` · `/notes/permanently` · `/notes/restore` | 다중 선택 일괄 처리 |
| POST | `/notes/download` | 내보내기. `file_format` 은 `md`(기본) 또는 `pdf`, 여러 개면 zip |
| POST | `/notes/files` | 파일 업로드로 노트 생성 |
| POST | `/notes/{note_hash}/images` | 본문 이미지 업로드 |

### 7-4. 스냅샷

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/notes/{note_hash}/snapshots` | 스냅샷 목록 |
| POST | `/notes/{note_hash}/snapshots` | 스냅샷 수동 생성 |
| DELETE | `/notes/{note_hash}/snapshots/{snapshot_hash}` | 스냅샷 삭제 |

### 7-5. 워크스페이스 · 분류 · 설정

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET · POST | `/workspaces` | 워크스페이스 목록 / 생성 |
| DELETE | `/workspaces/{workspace_hash}` | 삭제 |
| GET | `/workspaces/{workspace_hash}/notes` | 공유된 노트 목록 |
| GET | `/workspaces/{workspace_hash}/users` | 멤버 목록 |
| POST · DELETE | `/workspaces/{workspace_hash}/users/{user_hash}` | 멤버 추가 / 제외 |
| GET | `/tags` | 태그 목록 |
| GET · POST | `/templates` | 템플릿 목록 / 생성 |
| GET · DELETE | `/templates/{template_id}` | 템플릿 조회 / 삭제 |
| GET · PATCH | `/preferences` | 스냅샷·휴지통 정책 조회 / 변경 |

---

## 8. 환경 변수

백엔드 컨테이너에 주입한다. 로컬 실행용 값은 `docker-compose.local.yaml` 에 들어 있다.

| 변수 | 기본값 | 필수 | 설명 |
| --- | --- | --- | --- |
| `SETTINGS_FILE` | — | O | 설정 파일 선택 (`local` / `prod`) |
| `SECRET_KEY` | — | O | JWT 서명 키 |
| `KEK` | — | O | 사용자 데이터 키를 감싸는 마스터 키 (base64, 32바이트) |
| `KEK_VERSION` | — | O | 키 교체 이력 관리용 버전 |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | — | O | PostgreSQL 접속 정보 |
| `FRONTEND_URL` | — | O | CORS 허용 주소이자 리프레시 토큰 쿠키 도메인 산출 기준 |
| `MEILISEARCH_URL` | — | O | Meilisearch 주소 |
| `MEILISEARCH_MASTER_KEY` | `""` | △ | Meilisearch 마스터 키 (`MEILI_ENV=production` 이면 필수) |
| `MEILISEARCH_INDEX_UID` | — | O | 인덱스 이름 |
| `REDIS_URL` | `redis://localhost:6379/0` | X | Celery 브로커 / 백엔드 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15M` | X | 액세스 토큰 만료. `15M`, `14D` 형식 |
| `REFRESH_TOKEN_EXPIRE_MINUTES` | `14D` | X | 리프레시 토큰 만료 |
| `TRASH_RETENTION_DAYS` | `30` | X | 휴지통 기본 보관 일수 |
| `DEBUG` | `true` | X | 디버그 모드 |

---

## 9. 프로젝트 구조

```
backend/
  app/
    core/                  설정, 세션, JWT, 미들웨어, Celery, 검색 엔진,
                           스토리지 추상화, PDF 렌더러
    modules/
      note/
        domain/            엔티티
        application/       서비스, Celery 태스크
        infrastructure/    SQLAlchemy 모델, 리포지토리
        interfaces/        라우터, 스키마, 의존성
        tests/
      tag/  template/  workspace/  preference/  search/  user/
  migrations/              Alembic
  scripts/                 데이터 백필 스크립트
  manage.py                모듈 생성 등 관리 커맨드
frontend/
  app/
    (main)/                노트 목록, 휴지통, 워크스페이스, 설정
    (public)/s/[noteId]/   공개 노트 열람
    login/
  components/              에디터, 사이드바, 설정 패널, 모달
  hooks/                   자동 저장, 노트 조회·페이징, 태그
  lib/                     API 클라이언트, 에디터 구성
  store/                   Zustand 스토어
docker-compose.local.yaml
Makefile
```
