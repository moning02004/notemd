FROM python:3.13-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# gcc 는 두지 않는다. requirements 의 패키지는 모두 빌드된 휠(manylinux)로 받는다.
#   새 패키지가 소스 빌드를 하려다 실패하면 그때 이 줄에 gcc 를 다시 넣는다.
# libpango*: WeasyPrint 의 텍스트 레이아웃 엔진
# fonts-nanum: PDF 본문용 기본 한글 폰트. 한글/가나/상용 한자를 담고 있고 4MB 대라
#   렌더링마다 일어나는 폰트 서브셋이 빠르다(짧은 노트 기준 약 0.3초).
# fonts-noto-cjk: 나눔에 없는 희귀 CJK 글자용 폴백. 19MB 라 서브셋이 느려서
#   기본 폰트로 쓰면 같은 노트가 6초 가까이 걸린다. 실제로 필요한 글자가 있을 때만 쓰인다.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libpango-1.0-0 \
        libpangoft2-1.0-0 \
        fonts-nanum \
        fonts-noto-cjk && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["gunicorn", "main:app", "-c", "gunicorn.conf.py"]