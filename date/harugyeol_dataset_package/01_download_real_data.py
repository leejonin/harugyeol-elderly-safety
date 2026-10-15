"""UCI 799 실제 데이터 다운로드 및 원본 CSV 추출. 실행: python 01_download_real_data.py"""
from pathlib import Path
import urllib.request, zipfile, io, csv
p=Path(__file__).resolve().parent/'real_uci799';p.mkdir(exist_ok=True)
u='https://archive.ics.uci.edu/static/public/799/single+elder+home+monitoring+gas+and+position.zip'
print('Downloading UCI 799...')
data=urllib.request.urlopen(u,timeout=90).read()
with zipfile.ZipFile(io.BytesIO(data)) as z:
 for info in z.infolist():
  if info.filename.lower().endswith('.csv') and not info.filename.startswith('__MACOSX/'):
   name=Path(info.filename).name
   (p/name).write_bytes(z.read(info))
   print('saved',name)
print('원본은 가스/환경 센서와 움직임 이벤트로 분리되어 있습니다. 단순 행 결합하지 마세요.')
print('시연 CSV의 anomaly_label은 UCI 원본에 존재하지 않습니다.')
