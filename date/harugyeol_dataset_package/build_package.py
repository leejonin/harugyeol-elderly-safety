import csv,random,datetime,zipfile,urllib.request,io,pathlib
P=pathlib.Path(__file__).resolve().parent
random.seed(20261013)
cols=['timestamp','elder_id','motion','power_w','door_open','temperature_c','humidity_pct','gas_alert','medication_due','medication_taken','response_confirmed','scenario','anomaly_label','data_origin']
start=datetime.datetime(2026,10,1)
rows=[]
for day in range(14):
 for minute in range(0,1440,10):
  t=start+datetime.timedelta(days=day,minutes=minute);h=t.hour
  sleeping=h<6 or h>=23
  motion=int(random.random() < (0.04 if sleeping else .77))
  power=round(random.uniform(400,1100),1) if h in (7,12,18) and random.random()<.35 else round(random.uniform(0,25),1)
  door=int(h in (9,16) and random.random()<.09)
  temp=round(22+random.uniform(-1.8,2.2),1);humidity=round(48+random.uniform(-9,9),1)
  gas=0;due=int(h in (8,20) and t.minute==0);taken=int(due and random.random()<.94);response=1;scenario='normal';anomaly=0
  if day in (3,10) and 8<=h<11:
   motion=0;power=0;scenario='prolonged_inactivity';anomaly=int(h>=10)
  if day==6 and h==13 and t.minute in (10,20,30):
   gas=1;temp=round(33+random.random()*3,1);scenario='gas_sensor_alert';anomaly=1
  if day==8 and h==20 and t.minute==0:
   taken=0;scenario='medication_unconfirmed';anomaly=1
  if day==12 and h==9 and t.minute in (0,10,20):
   response=0;scenario='checkin_no_response';anomaly=1
  rows.append([t.strftime('%Y-%m-%d %H:%M:%S'),'E001',motion,power,door,temp,humidity,gas,due,taken,response,scenario,anomaly,'synthetic'])
with (P/'02_demo_synthetic.csv').open('w',newline='',encoding='utf-8-sig') as f:
 w=csv.writer(f);w.writerow(cols);w.writerows(rows)
with (P/'03_scenarios.csv').open('w',newline='',encoding='utf-8-sig') as f:
 w=csv.writer(f);w.writerow(['scenario','meaning','is_real_incident_label']);w.writerows([['normal','일반 생활 패턴','no'],['prolonged_inactivity','활동 시간대 장시간 움직임 없음','no'],['gas_sensor_alert','가스 센서 경보 가정','no'],['medication_unconfirmed','복약 확인 누락','no'],['checkin_no_response','안부 확인 무응답','no']])
(P/'01_download_real_data.py').write_text('''"""UCI 799 실제 데이터 다운로드 및 원본 CSV 추출. 실행: python 01_download_real_data.py"""\nfrom pathlib import Path\nimport urllib.request, zipfile, io, csv\np=Path(__file__).resolve().parent/'real_uci799';p.mkdir(exist_ok=True)\nu='https://archive.ics.uci.edu/static/public/799/single+elder+home+monitoring+gas+and+position.zip'\nprint('Downloading UCI 799...')\ndata=urllib.request.urlopen(u,timeout=90).read()\nwith zipfile.ZipFile(io.BytesIO(data)) as z:\n for info in z.infolist():\n  if info.filename.lower().endswith('.csv') and not info.filename.startswith('__MACOSX/'):\n   name=Path(info.filename).name\n   (p/name).write_bytes(z.read(info))\n   print('saved',name)\nprint('원본은 가스/환경 센서와 움직임 이벤트로 분리되어 있습니다. 단순 행 결합하지 마세요.')\nprint('시연 CSV의 anomaly_label은 UCI 원본에 존재하지 않습니다.')\n''',encoding='utf-8')
(P/'README_먼저읽기.txt').write_text('''하루결 — AI 노인 안전관리 데이터셋 패키지\n\n1) 02_demo_synthetic.csv: 가상 14일 × 10분 간격 = 2,016행. 즉시 웹 시연용으로 사용 가능. 실제 노인 기록이 아닙니다.\n2) 01_download_real_data.py: 인터넷 연결된 PC에서 실행하면 UCI 799 원본 CSV를 real_uci799 폴더에 저장합니다. 이 환경에서는 외부 원본 다운로드가 불가능해 원본 데이터 파일은 포함하지 않았습니다.\n3) 03_scenarios.csv: 시연 상황별 설명.\n\nUCI 출처: https://archive.ics.uci.edu/dataset/799/single+elder+home+monitoring+gas+and+position\n원본 라이선스: CC BY 4.0, 출처 표기 필요.\n\n주의: 시연 anomaly_label은 인위적으로 정의한 테스트 라벨입니다. 응급상황을 검증한 의료 라벨이 아닙니다.\nUCI 원본은 전력, 문 열림, 복약 확인 데이터를 제공하지 않습니다. 이 값은 시연용 CSV에만 합성했습니다.\nUCI 원본의 움직임 이벤트와 환경 센서 기록은 타임스탬프 기준으로 별도 정렬·집계해야 합니다.\n현재 GitHub Pages 사이트의 백엔드/API 스키마가 확인되지 않았으므로 직접 업로드 호환성을 보장할 수 없습니다.\nAPI 키를 프론트엔드 HTML/JS에 넣으면 공개됩니다. 노출된 키는 즉시 폐기 후 서버 환경변수로만 관리하세요.\n''',encoding='utf-8')
with zipfile.ZipFile('/mnt/data/harugyeol_dataset_package.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in P.iterdir():
  if f.is_file():z.write(f,arcname=f.name)
print(len(rows),[(x.name,x.stat().st_size) for x in P.iterdir()])
