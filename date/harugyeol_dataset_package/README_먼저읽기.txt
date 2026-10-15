하루결 — AI 노인 안전관리 데이터셋 패키지

1) 02_demo_synthetic.csv: 가상 14일 × 10분 간격 = 2,016행. 즉시 웹 시연용으로 사용 가능. 실제 노인 기록이 아닙니다.
2) 01_download_real_data.py: 인터넷 연결된 PC에서 실행하면 UCI 799 원본 CSV를 real_uci799 폴더에 저장합니다. 이 환경에서는 외부 원본 다운로드가 불가능해 원본 데이터 파일은 포함하지 않았습니다.
3) 03_scenarios.csv: 시연 상황별 설명.

UCI 출처: https://archive.ics.uci.edu/dataset/799/single+elder+home+monitoring+gas+and+position
원본 라이선스: CC BY 4.0, 출처 표기 필요.

주의: 시연 anomaly_label은 인위적으로 정의한 테스트 라벨입니다. 응급상황을 검증한 의료 라벨이 아닙니다.
UCI 원본은 전력, 문 열림, 복약 확인 데이터를 제공하지 않습니다. 이 값은 시연용 CSV에만 합성했습니다.
UCI 원본의 움직임 이벤트와 환경 센서 기록은 타임스탬프 기준으로 별도 정렬·집계해야 합니다.
현재 GitHub Pages 사이트의 백엔드/API 스키마가 확인되지 않았으므로 직접 업로드 호환성을 보장할 수 없습니다.
API 키를 프론트엔드 HTML/JS에 넣으면 공개됩니다. 노출된 키는 즉시 폐기 후 서버 환경변수로만 관리하세요.
