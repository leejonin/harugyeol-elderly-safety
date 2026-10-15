# 가상 CSV 데이터 로드 및 조회

- 문서 초기 생성 일시: 2026-10-15 14:45 KST
- 문서 수정 일시: 2026-10-15 14:45 KST

## 1. 개요

합성 CSV 패키지(`date/harugyeol_dataset_package/`)의 2,016행 시연 데이터를 별도 웹 화면에서 로드·필터·시각화·표 조회하는 기능입니다. 기존 `js/data.js` 시연 저장소는 변경하지 않습니다.

## 2. 용어 정의

| 용어 | 의미 |
| --- | --- |
| 합성 CSV | 실제 센서 수신이 아닌 `synthetic` 출처로 생성된 시연용 기록 |
| `anomaly_label` | 데이터셋에 포함된 합성 라벨로, 의료·응급 검증값이 아님 |
| 파일 폴백 | `file://` 등에서 `fetch`가 실패할 때 사용자가 CSV 파일을 직접 선택하는 방식 |

## 3. 개념 설명

로그인 후 `dataset.html`에 진입하면 `Harugyeol.Dataset.fetchDefaultBundle`이 상대 경로로 `02_demo_synthetic.csv`와 `03_scenarios.csv`를 불러옵니다. GitHub Pages·Netlify 등 HTTP 환경에서는 자동 로드되고, 로컬 `file://`에서 차단되면 오류 메시지와 함께 파일 선택 UI가 표시됩니다.

`js/csv-demo.js`는 BOM·따옴표를 처리하는 CSV 파서, 14열 스키마 검증, 숫자·0/1 형 변환, 시나리오 설명 병합, 날짜·시나리오·이상 라벨 필터, 요약 집계를 제공합니다. `js/pages/dataset.js`는 요약 카드, Canvas 추이·이벤트 차트, 100행 페이지네이션 표, 합성 데이터 경고 문구를 렌더링합니다.

주요 코드 경로:

- `dataset.html`, `js/pages/dataset.js`: CSV 시연 화면
- `js/csv-demo.js`: 파싱·검증·필터·집계 (`window.Harugyeol.Dataset`)
- `js/common.js`: 상단 메뉴 「CSV 시연」 링크
- `css/style.css`: 시연 화면 전용 스타일
- `date/harugyeol_dataset_package/02_demo_synthetic.csv`: 원본 데이터(수정 없음)

## 4. 현재 구현 상태

- 상태: **구현 완료**
- 실제 동작: HTTP 환경에서 2,016행·14열 합성 CSV를 메모리에 로드하고 필터·차트·표로 조회합니다. `file://`에서는 동일 파서로 사용자 선택 파일을 로드할 수 있습니다.
- 제한: 실제 센서·서버 저장·`localStorage` 대상자 데이터 연동은 없습니다. 가스·복약 열은 시연 표시이며 `9.x` 후보 기능의 실연동 완료를 의미하지 않습니다.

## 5. 수정한 작업 전후 내용

| 구분 | 수정 전 | 수정 후 | 변경 이유 |
| --- | --- | --- | --- |
| CSV 시연 화면 | 미구현 | `dataset.html` 및 파서·UI 모듈 추가 | 가상 데이터셋 시연 계획 반영 |
| 기능 ID | `3.4.1` 없음 | `3.4.1` 문서·목록·분류 등록 | ForAgents ID 체계 연결 |

## 6. 기능 ID 및 관련 기능 ID

- 기능 ID: `3.4.1`
- 관련 기능 ID: `3.2.2`, `3.2.3`, `8.2.1`, `8.3.1`, `8.3.2`, `9.1.3`, `9.2.1`
