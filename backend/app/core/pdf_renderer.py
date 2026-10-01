import html as html_lib
import mimetypes
import re
from collections.abc import Callable
from urllib.parse import urlparse

from weasyprint import CSS, HTML
from weasyprint.urls import URLFetcher, URLFetcherResponse

from app.core.config import settings

# 본문 폰트는 나눔바른고딕을 먼저 쓴다. 한글/가나/상용 한자를 담고 있으면서 파일이 작아
# 렌더링마다 일어나는 폰트 서브셋이 빠르다. 여기에 없는 희귀 CJK 글자만 Noto 로 넘어간다.
# (Noto 를 먼저 두면 19MB 폰트를 매번 서브셋하느라 같은 노트가 20배 가까이 느려진다.)
FONT_STACK = '"NanumBarunGothic", "Noto Sans CJK KR", sans-serif'

# 에디터 화면과 비슷한 모양으로 인쇄되도록 하는 스타일시트.
# 본문 HTML 은 에디터가 저장한 것을 그대로 쓰므로, 표·코드블록처럼
# 화면에서 CSS 로 꾸미던 요소는 여기서 다시 정의한다.
DEFAULT_CSS = """
@page {
    size: A4;
    margin: 20mm 15mm;
    @bottom-center {
        content: counter(page) " / " counter(pages);
        font-family: __FONT_STACK__;
        font-size: 9pt;
        color: #888;
    }
}

body {
    font-family: __FONT_STACK__;
    font-size: 10.5pt;
    line-height: 1.7;
    color: #222;
}

.note-title {
    font-size: 20pt;
    font-weight: 700;
    margin-bottom: 4mm;
    padding-bottom: 3mm;
    border-bottom: 1px solid #ddd;
}

h1 { font-size: 17pt; margin: 6mm 0 2mm; }
h2 { font-size: 14pt; margin: 5mm 0 2mm; }
h3 { font-size: 12pt; margin: 4mm 0 2mm; }
h1, h2, h3 { page-break-after: avoid; }

p { margin: 1.5mm 0; }
a { color: #1f6650; }

ul, ol { margin: 1.5mm 0; padding-left: 6mm; }
li > p { margin: 0.5mm 0; }
ul[data-type="taskList"] { list-style: none; padding-left: 2mm; }

blockquote {
    border-left: 3px solid #d5d5d5;
    padding-left: 4mm;
    margin: 2mm 0;
    color: #555;
}

pre {
    background-color: #f6f7f6;
    border: 1px solid #e5e5e5;
    border-radius: 3px;
    padding: 3mm;
    margin: 2mm 0;
    font-size: 9pt;
    line-height: 1.45;
    white-space: pre-wrap;
    word-wrap: break-word;
}
code { font-family: "NanumGothicCoding", "DejaVu Sans Mono", monospace; }
p > code, li code {
    background-color: #f0f0f0;
    padding: 0 1mm;
    border-radius: 2px;
    font-size: 9.5pt;
}

/* 에디터처럼 폭을 정하지 않은 열은 내용에 맞춰 나눈다(auto). 정한 열은 <col> 의 비율을 따른다. */
table {
    width: 100%;
    border-collapse: collapse;
    margin: 2mm 0;
    table-layout: auto;
    font-size: 9.5pt;
}
/* 칸에 적힌 정렬·배경(style)이 이 기본값보다 앞선다. */
th, td {
    border: 1px solid #c8c8c8;
    padding: 1.5mm 2mm;
    text-align: left;
    vertical-align: top;
    word-break: keep-all;
    /* 긴 주소처럼 끊을 곳이 없는 낱말이 표를 A4 밖으로 밀어내지 않게 한다. */
    overflow-wrap: anywhere;
}
th { background-color: #f2f2f2; font-weight: 700; }
tr { page-break-inside: avoid; }

/* 큰 이미지 하나가 페이지를 통째로 차지하지 않도록 높이도 제한한다. */
img { max-width: 100%; max-height: 180mm; }
hr { border: none; border-top: 1px solid #ddd; margin: 4mm 0; }

/*
 * 접기. 화면과 같이 쉐브론 + 굵은 제목, 들여 쓴 본문 왼쪽에 얇은 세로선.
 * 종이에서는 펼 수 없으므로 닫아 둔 접기도 펼친 채로 싣는다(쉐브론도 늘 펼친 모양 ⌄).
 */
details { display: block; margin: 2mm 0; }
summary {
    display: block;
    position: relative;
    padding-left: 5mm;
    font-weight: 700;
    page-break-after: avoid;
}
summary::before {
    content: "";
    position: absolute;
    left: 1.1mm;
    top: 0.5em;
    width: 1.5mm;
    height: 1.5mm;
    border-right: 1.3px solid #555;
    border-bottom: 1.3px solid #555;
    transform: rotate(45deg);
}
summary:empty::after { content: "제목 없음"; color: #999; font-weight: 400; }
details [data-type="detailsContent"] {
    margin: 1mm 0 0 1.85mm;
    padding-left: 2.8mm;
    border-left: 1.3px solid #bdbfb9;
}
details [data-type="detailsContent"] > :first-child { margin-top: 0; }
details [data-type="detailsContent"] > :last-child { margin-bottom: 0; }
""".replace("__FONT_STACK__", FONT_STACK)

EMPTY_DETAILS_BODY = re.compile(
    r'<div[^>]*\bdata-type="detailsContent"[^>]*>\s*<p>\s*(?:<br\s*/?>)?\s*</p>\s*</div>')

EMPTY_PARAGRAPH = re.compile(r"<p((?:\s[^>]*)?)>\s*(?:<br\s*/?>)?\s*</p>")

CHECKED_MARK = "&#9745;"  # ☑
UNCHECKED_MARK = "&#9744;"  # ☐


def _task_item(match: re.Match) -> str:
    """Tiptap 체크리스트 항목을 '☑ 내용' 한 줄로 만든다.

    저장된 구조는 <li><label><input type=checkbox><span></span></label><div><p>내용</p></div></li> 인데,
    인쇄 렌더러는 폼 요소를 그리지 않으므로 체크 상태를 문자로 바꿔 넣는다.
    """
    mark = CHECKED_MARK if match.group(1) == "true" else UNCHECKED_MARK
    inner = re.sub(r"</?(?:label|div|span)[^>]*>", "", match.group(2))
    inner = re.sub(r"<input[^>]*>", "", inner)

    if "<p>" in inner:
        inner = inner.replace("<p>", f"<p>{mark} ", 1)
    else:
        inner = f"<p>{mark} {inner.strip()}</p>"
    return f"<li>{inner}</li>"


# 에디터의 폭(px)을 비율로 바꿀 때 기준으로 삼는 본문 폭. A4 에서 여백을 뺀 폭(180mm)을 96dpi 로 환산했다.
PAGE_CONTENT_PX = 680
# 폭을 정하지 않은 열이 적어도 차지한다고 보는 몫. 정한 열만으로 폭을 다 써 버리지 않게 남겨 둔다.
AUTO_COLUMN_PX = 120


def _col_widths_to_percent(match: re.Match) -> str:
    """표의 열 너비를 픽셀에서 비율로 바꾼다.

    에디터는 손으로 맞춘 열에만 편집 화면 기준의 픽셀 폭(<col style="width: 1347px">)을 저장하고,
    손대지 않은 열은 최소 폭(<col style="min-width: 64px">)만 적어 두고 내용에 맞춰 나눈다.
    A4 폭을 넘기지 않게 맞춘 열은 비율로 바꾸고, 손대지 않은 열은 폭을 비워 PDF 에서도 내용에 맞춰 나뉘게 한다.
    (min-width 까지 폭으로 읽으면 손대지 않은 열이 64px 몫으로 찌그러진다.)
    """
    widths: list[float | None] = []
    for col in re.findall(r"<col\b[^>]*>", match.group(0)):
        fixed = re.search(r"(?<![\w-])width:\s*([\d.]+)px", col)
        widths.append(float(fixed.group(1)) if fixed else None)

    fixed_total = sum(w for w in widths if w)
    if not fixed_total:
        return ""

    # 모든 열을 맞췄으면 그 비율 그대로, 일부만 맞췄으면 나머지 열 몫을 남겨 두고 나눈다.
    auto_count = sum(1 for w in widths if not w)
    reference = fixed_total if not auto_count else max(fixed_total + AUTO_COLUMN_PX * auto_count, PAGE_CONTENT_PX)
    cols = "".join(f'<col style="width:{w / reference * 100:.2f}%">' if w else "<col>" for w in widths)
    return f"<colgroup>{cols}</colgroup>"


# 본문 이미지는 이 주소로 바꿔 두고, PDF 를 그릴 때 저장소에서 받아 넣는다(아래 url_fetcher).
IMAGE_SCHEME = "note-image"
UPLOAD_PREFIX = f"/{settings.STORAGE['name']}/"


def upload_name(src: str) -> str | None:
    """이미지 주소에서 업로드한 파일 이름을 꺼낸다. 업로드한 이미지가 아니면 None.

    편집기는 'http://<API 주소>/uploads/<이름>' 처럼 호스트까지 붙여 저장한다. 호스트는 보지 않는다
    (배포 주소가 바뀌어도 같은 파일이다). 예전 노트의 '/uploads/<이름>' 도 같이 받는다.
    """
    path = urlparse(src).path
    if not path.startswith(UPLOAD_PREFIX):
        return None
    name = path[len(UPLOAD_PREFIX):]
    return name if name and "/" not in name else None


def _localize_image(match: re.Match) -> str:
    """업로드한 이미지는 저장소에서 받도록 주소를 바꾸고, 바깥 주소 이미지는 지운다.

    바깥 주소를 PDF 를 그리는 서버가 받으러 가면 느려지거나 서버 안쪽 주소를 건드릴 수 있다.
    """
    name = upload_name(html_lib.unescape(match.group(1)))
    return f'<img src="{IMAGE_SCHEME}:{name}">' if name else ""


def _prepare_html(content: str) -> str:
    content = content or ""

    content = re.sub(r"<colgroup>.*?</colgroup>", _col_widths_to_percent, content, flags=re.DOTALL)
    # 표 자체의 픽셀 고정 폭은 A4 폭을 넘기므로 걷어내고, 스타일시트의 width:100% 를 따르게 한다.
    content = re.sub(
        r"<table((?:\s[^>]*)?)>",
        lambda m: f"<table{re.sub(r'''\s(?:style|width)="[^\"]*"''', '', m.group(1))}>",
        content,
    )

    content = re.sub(
        r'<li data-checked="(true|false)"[^>]*>(.*?)</li>',
        _task_item,
        content,
        flags=re.DOTALL,
    )
    content = re.sub(r'<img[^>]*src="([^"]*)"[^>]*>', _localize_image, content)
    # 제목만 적은 접기는 본문에 빈 문단 하나가 딸려 온다(스키마상 본문이 비어 있을 수 없다).
    # 화면처럼 감추려면 세로선만 남은 빈 칸이 생기므로 본문째 뺀다.
    content = EMPTY_DETAILS_BODY.sub("", content)
    # 에디터에서 Enter 를 여러 번 쳐 둔 빈 줄은 빈 문단(<p></p>)으로 저장된다. 빈 문단은 PDF 에서 높이가 0 이라
    # 몇 줄을 비워 두든 한 줄 간격으로 뭉쳤다. 보이지 않는 공백을 하나 넣어 화면처럼 한 줄씩 차지하게 한다.
    content = EMPTY_PARAGRAPH.sub(r"<p\1>&nbsp;</p>", content)
    return content


class _NoteImageFetcher(URLFetcher):
    """업로드한 이미지만 저장소에서 받는다. 그 밖의 주소는 어떤 것도 불러오지 않는다.

    weasyprint 는 실패를 다룰 때 fetcher 의 설정(_fail_on_errors)을 읽으므로 함수가 아니라 URLFetcher 를 이어받는다.
    받지 못한 이미지는 경고만 남기고 빼고 그린다(fail_on_errors=False).
    """

    def __init__(self, read_image: Callable[[str], bytes | None] | None):
        super().__init__(fail_on_errors=False)
        self._read_image = read_image

    def fetch(self, url, headers=None) -> URLFetcherResponse:
        if self._read_image and url.startswith(f"{IMAGE_SCHEME}:"):
            name = url[len(IMAGE_SCHEME) + 1:]
            data = self._read_image(name)
            if data is not None:
                mime_type = mimetypes.guess_type(name)[0] or "application/octet-stream"
                return URLFetcherResponse(url, body=data, headers={"Content-Type": mime_type})
        raise ValueError(f"PDF 에 넣지 않는 주소: {url}")


def render_note_pdf(title: str, content: str,
                    read_image: Callable[[str], bytes | None] | None = None) -> bytes:
    """노트 HTML 을 PDF 바이트로 렌더링한다.

    read_image: 업로드한 파일 이름을 받아 그 바이트를 돌려준다(저장소의 read). 없으면 이미지를 넣지 않는다.
    """
    heading = html_lib.escape(title or "제목없음")
    body = (
        '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">'
        f"<title>{heading}</title></head><body>"
        f'<div class="note-title">{heading}</div>{_prepare_html(content)}'
        "</body></html>"
    )

    document = HTML(string=body, url_fetcher=_NoteImageFetcher(read_image))
    return document.write_pdf(stylesheets=[CSS(string=DEFAULT_CSS)])
