# 하루결 — AI 노인 안전관리

카메라 없이 생활 신호를 살펴보고, 평소와 다른 변화가 보이면 먼저 안부를 묻는 서비스를 보여주는 **웹 시연 프로젝트**입니다. 가족·보호자와 관리기관 담당자가 어르신의 생활 기록, 확인 필요 상태와 대응 내역을 살펴볼 수 있습니다.

**[배포 사이트 바로가기](https://leejonin.github.io/harugyeol-elderly-safety/)** · **[시연 시작](https://leejonin.github.io/harugyeol-elderly-safety/login.html)** · [GitHub 저장소](https://github.com/leejonin/harugyeol-elderly-safety)

> 현재 화면은 예시 데이터와 합성 CSV로 동작합니다. 실제 센서 수집, 실내 스피커 호출, 보호자 연락·응급 신고는 연결되어 있지 않습니다. 생활패턴 분석은 JavaScript 규칙 기반 시연이며, 실제 응급상황을 판정하는 서비스가 아닙니다.

## 주요 기능

- **대시보드**: 담당 어르신 선택, 현재 상태, 마지막 안부 확인·데이터 갱신 시각, 알림과 기기 상태 확인
- **생활패턴**: 전력 사용·움직임·문 열림 기록 조회, 합성 CSV를 이용한 평소 기준과 특정 날짜의 변화 비교
- **알림·대응**: 예시 알림 확인 및 대응 상태 기록
- **AI 대화**: 대상자별 대화, 상태 요약, CSV 분석 참고, 일별 Markdown 보고서 미리보기·다운로드
- **음성 읽기**: 브라우저가 지원하면 AI 답변 읽기와 중지
- **CSV 시연**: 합성 데이터 로드, 필터, 차트와 표 조회
- **보기 설정**: 글자 크기 3단계, 고대비 모드, 모바일 메뉴와 큰 버튼

## 바로 사용하기

1. [배포 사이트](https://leejonin.github.io/harugyeol-elderly-safety/)에서 **시연 시작하기**를 누릅니다.
2. **김보호(가족·보호자)** 또는 **이담당(관리기관 담당자)** 계정을 선택합니다. 비밀번호 없이 들어가는 시연용 계정입니다.
3. 대시보드에서 어르신을 고른 뒤 생활패턴, 알림·대응, AI 대화 화면을 확인합니다.
4. CSV 시연 화면에서 데이터를 불러와 분석합니다. AI 대화 설정의 **CSV 참고 갱신**으로도 참고 데이터를 불러올 수 있습니다.
5. AI 대화에 `10월 11일 생활패턴 분석 보고서 작성해 줘`를 입력하면 합성 CSV에 근거한 일별 보고서를 미리 보고 `.md` 파일로 내려받을 수 있습니다.

보고서용 CSV 기간은 **2026-10-01~2026-10-14**입니다. 기간 밖 날짜나 잘못된 날짜는 오류를 안내합니다. CSV 대상자 `E001`은 시연용 가상 대상이며 실제 어르신 기록과 연결되지 않습니다.

## 로컬 실행

별도 패키지 설치나 프런트엔드 빌드 없이 정적 웹 서버로 실행합니다. Python 3이 설치되어 있다면 다음 명령을 사용하세요.

```sh
git clone https://github.com/leejonin/harugyeol-elderly-safety.git
cd harugyeol-elderly-safety
python -m http.server 8000 --bind 127.0.0.1
```

브라우저에서 [로컬 사이트](http://localhost:8000/)를 엽니다. 파일을 직접 더블 클릭하면 CSV를 읽는 `fetch`가 브라우저 정책에 막힐 수 있으므로 HTTP 주소로 접속하세요.

## AI 대화 설정

AI 대화 화면의 **☰ 설정**에서 API 키와 모델을 입력하고 **키 저장**을 누릅니다. 기본 모델은 `gpt-4o-mini`, 기본 API 주소는 `https://api.openai.com/v1`입니다. 키가 없거나 모의 응답을 선택하면 목(mock) 응답을 사용합니다. 날짜별 CSV 보고서는 OpenAI 호출 전에 브라우저에서 생성합니다.

현재 구현은 API 키를 해당 브라우저의 `localStorage`에 저장하고 브라우저에서 API를 직접 호출하는 시연 방식입니다. 공용 기기에서는 사용 후 **키 삭제**를 누르세요. 실제 운영에서는 서버에서 키를 보관하고 인증·권한 검사를 적용하는 구성이 필요합니다. 키와 키 이미지는 저장소에 올리지 마세요.

시연 데이터와 일부 설정은 브라우저 저장소에 보관됩니다. 로그인 화면의 **시연 데이터 초기화**는 예시 데이터로 되돌리는 기능이며, AI API 키는 AI 대화 설정에서 별도로 삭제합니다. 시연 계정의 대상자 구분은 브라우저 코드에서 처리하며 실제 서버 인증을 제공하지 않습니다.

## 프로젝트 구성

```text
.
├── index.html                 # 서비스 소개
├── login.html                 # 시연 계정 선택
├── dashboard.html             # 대상자·상태 대시보드
├── pattern.html               # 생활패턴 조회·분석
├── alerts.html                # 알림·대응
├── chat.html                  # AI 대화·보고서
├── dataset.html               # 합성 CSV 시연
├── settings.html              # 대상자·기기 등 설정
├── help.html                  # 도움말
├── css/style.css              # 공통·반응형 스타일
├── js/
│   ├── common.js              # 세션·공통 화면·보기 설정
│   ├── data.js                # 예시 데이터·브라우저 저장
│   ├── csv-demo.js            # CSV 파싱·검증·집계
│   ├── pattern-analysis.js    # 규칙 기반 생활패턴 분석
│   ├── chat-csv-context.js    # 대화용 CSV 요약·일별 보고서
│   ├── llm/                   # OpenAI·목 응답 처리
│   └── pages/                 # 화면별 동작
├── date/harugyeol_dataset_package/
│   ├── 02_demo_synthetic.csv  # 14일·10분 간격 합성 데이터
│   └── 03_scenarios.csv       # 시연 상황 설명
├── Info/                      # 기능 설명·작업 기록·발표 자료
└── .github/workflows/pages.yml
```

데이터 폴더 이름은 실제 저장소 기준으로 `date`입니다.

## 기술 및 배포

- HTML5, CSS, JavaScript와 브라우저 Web Storage·Fetch·Web Speech API를 사용합니다. 별도 프레임워크와 패키지 잠금 파일은 없습니다.
- GitHub Pages 정적 호스팅과 GitHub Actions를 사용합니다. 워크플로는 `actions/checkout@v4`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`, `ubuntu-latest`로 구성되어 있습니다.
- `main` 브랜치에 푸시하면 `.github/workflows/pages.yml`이 배포를 실행합니다. 수동 실행도 지원합니다.
- [배포 실행 내역](https://github.com/leejonin/harugyeol-elderly-safety/actions/workflows/pages.yml)에서 결과를 확인할 수 있습니다.
- 현재 워크플로는 저장소의 파일을 정적 사이트로 업로드합니다. 저장소에 올리는 문서와 첨부 자료도 공개 대상이므로 인증 정보와 개인 자료를 포함하지 마세요.

## 데이터와 문서

합성 CSV는 **14일 × 10분 간격, 2,016행**이며 실제 노인의 생활 기록이 아닙니다. `anomaly_label`은 시연을 위해 만든 테스트 값입니다. 의료적으로 검증된 응급상황 라벨이 아닙니다.

데이터 패키지에는 [UCI Single elder home monitoring: Gas and Position](https://archive.ics.uci.edu/dataset/799/single+elder+home+monitoring+gas+and+position) 원본 다운로드 스크립트가 있습니다. 원본은 패키지 안내 기준 CC BY 4.0이며 사용 시 출처를 표시해야 합니다. 전력·문 열림·복약 값은 합성 CSV에 추가한 시연 항목입니다. 자세한 사항은 [데이터 패키지 안내](date/harugyeol_dataset_package/README_먼저읽기.txt)를 확인하세요. 이 데이터 출처의 라이선스 안내는 프로젝트 전체 코드의 라이선스를 지정하는 의미가 아닙니다.

- [프로젝트 개요](Info/하루결_웹페이지_개요.md)
- [기능 분류](Info/분류.md)
- [기능 ID 목록](Info/기능_ID_목록.md)
- [배포 기능 문서](Info/대화%20도우미%20및%20서비스%20배포/정적%20웹%20배포/10.2.1/GitHub%20Pages%20배포.md)

---

문서 최초 작성·수정일: 2026-11-10 (KST) · 지시자: 이종인 · 작업자: GPT-6 (Codex) · 관련 기능 ID: `000`, `10.2.1`
