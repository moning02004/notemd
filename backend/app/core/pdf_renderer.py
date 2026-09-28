import html as html_lib
import re
from pathlib import Path

from weasyprint import CSS, HTML

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

details { margin: 2mm 0; }
summary { font-weight: 700; margin-bottom: 1mm; }
""".replace("__FONT_STACK__", FONT_STACK)

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


def _localize_image(match: re.Match) -> str:
    """이미지 src 를 base_url 기준 상대 경로로 바꾼다.

    업로드 파일은 '/uploads/<파일명>' 으로 저장돼 있다. 외부 URL 이거나 파일이 없으면
    렌더링이 지연되거나 깨진 이미지가 남으므로 태그째 지운다.
    """
    src = match.group(1)
    if not src.startswith("/"):
        return ""

    relative = src.lstrip("/")
    if not Path(relative).is_file():
        return ""
    return f'<img src="{relative}">'


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
    return content


def render_note_pdf(title: str, content: str) -> bytes:
    """노트 HTML 을 PDF 바이트로 렌더링한다."""
    heading = html_lib.escape(title or "제목없음")
    body = (
        '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">'
        f"<title>{heading}</title></head><body>"
        f'<div class="note-title">{heading}</div>{_prepare_html(content)}'
        "</body></html>"
    )

    # 이미지 src 가 'uploads/...' 상대 경로이므로 업로드 디렉터리의 상위를 기준으로 잡는다.
    base_url = Path(settings.STORAGE["name"]).resolve().parent
    document = HTML(string=body, base_url=str(base_url))
    return document.write_pdf(stylesheets=[CSS(string=DEFAULT_CSS)])
