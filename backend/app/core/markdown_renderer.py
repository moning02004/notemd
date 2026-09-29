"""노트 HTML 을 마크다운으로 바꾼다(노트 다운로드·데이터 내보내기).

에디터는 Enter 를 칠 때마다 문단(<p>)을 새로 만든다. markdownify 를 문서 통째로 쓰면
- 문단 사이마다 빈 줄이 들어가 에디터에서 한 줄씩 쓴 글이 두 줄 간격으로 벌어지고
- 비워 둔 줄(빈 문단)은 흔적 없이 사라진다.
그래서 맨 위 블록을 하나씩 바꿔 에디터에서 보이던 대로 잇는다.
- 글 문단끼리는 한 줄씩 잇는다(줄 끝 공백 두 칸 = 마크다운의 줄바꿈이라 렌더러에서도 줄이 바뀐다).
- 비워 둔 줄은 그 수만큼 빈 줄로 둔다.
- 표·목록·제목·코드처럼 마크다운이 앞뒤 빈 줄을 요구하는 블록은 그 빈 줄 하나를 더 둔다.

가져오기(markdown_to_html)는 같은 규칙을 거꾸로 읽는다. 내보낸 파일을 다시 가져와도 비운 줄 수가 그대로다.
"""
import re

from bs4 import BeautifulSoup, NavigableString, Tag
from markdown import markdown
from markdownify import markdownify

from app.core.pdf_renderer import EMPTY_DETAILS_BODY

LINE_BREAK = "  \n"
MARKDOWN_OPTIONS = {"heading_style": "ATX", "bullets": "-"}


def _is_blank_line(block: Tag) -> bool:
    """에디터에서 비워 둔 줄(빈 문단). 글자도 이미지도 없다."""
    return block.name == "p" and not block.get_text(strip=True) and block.find("img") is None


def html_to_markdown(content: str | None) -> str:
    # 제목만 적은 접기에 딸려 오는 빈 본문은 빈 줄로 남길 까닭이 없다(PDF 와 같다).
    content = EMPTY_DETAILS_BODY.sub("", content or "")
    soup = BeautifulSoup(content, "html.parser")

    parts: list[str] = []
    previous: str | None = None  # 앞 블록의 종류: "text"(글 문단) 또는 "block"
    blank_lines = 0

    for node in soup.contents:
        if isinstance(node, NavigableString):
            if not node.strip():
                continue
            kind, markdown = "text", markdownify(str(node), **MARKDOWN_OPTIONS).strip()
        elif _is_blank_line(node):
            if previous is not None:  # 맨 앞의 빈 줄은 버린다.
                blank_lines += 1
            continue
        else:
            kind = "text" if node.name == "p" else "block"
            markdown = markdownify(str(node), **MARKDOWN_OPTIONS).strip("\n")

        if previous is not None:
            # 글 문단끼리는 비워 둔 줄 수만큼(없으면 줄바꿈). 블록 앞뒤는 마크다운이 요구하는 빈 줄 하나에 더한다.
            gap = blank_lines if (previous == "text" and kind == "text") else blank_lines + 1
            parts.append(LINE_BREAK if gap == 0 else "\n" * (gap + 1))
        parts.append(markdown)
        previous, blank_lines = kind, 0

    return "".join(parts) + ("\n" if parts else "")


# ---------------------------------------------------------------- 가져오기

FENCED_CODE = re.compile(r"(```.*?```|~~~.*?~~~)", re.DOTALL)
# 마크다운 블록(제목·목록·인용·표·코드·HTML·구분선)으로 시작하는 줄. 그 밖의 줄은 글 문단이다.
BLOCK_LINE = re.compile(r"^(?:\s*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\||<)|(?: {4}|\t)|\s*(?:[-*_=]\s*){3,}$)")
BLANK_MARK = "&nbsp;"
MARKED_PARAGRAPH = re.compile(r"<p>&nbsp;</p>")


def _is_text_line(line: str | None) -> bool:
    return line is not None and bool(line.strip()) and not BLOCK_LINE.match(line)


def _mark_blank_lines(text: str, after_code: bool, before_code: bool) -> str:
    """비운 줄을 빈 문단 자리표(&nbsp; 문단)로 바꾼다. 마크다운은 연달은 빈 줄을 하나로 합치기 때문이다.

    글 문단 사이의 빈 줄 k 개는 비운 줄 k 개다(에디터의 줄끼리는 빈 줄 없이 이어 쓰므로).
    블록 앞뒤의 빈 줄은 하나가 마크다운의 몫이라 k-1 개만 비운 줄로 친다.
    줄 끝 공백 두 칸 다음의 공백만 있는 줄은 <br> 로 비운 줄이다. 문단을 끊지 않게 자리표를 둔다.
    """
    lines = text.split("\n")
    out: list[str] = []
    i = 0
    while i < len(lines):
        if lines[i].strip():
            out.append(lines[i])
            i += 1
            continue

        start = i
        while i < len(lines) and not lines[i].strip():
            i += 1
        before = lines[start - 1] if start > 0 else None
        after = lines[i] if i < len(lines) else None

        if (i - start == 1 and before is not None and after is not None and before.endswith("  ")
                and lines[start].startswith("  ")):
            out.append(f"{BLANK_MARK}  ")
            continue

        # 맨 앞뒤의 빈 줄은 버린다. 코드 블록과 맞닿은 쪽은 블록으로 본다.
        at_edge = (before is None and not after_code) or (after is None and not before_code)
        if at_edge:
            out.append("")
            continue
        count = i - start
        # 코드 블록과 맞닿은 쪽의 빈 조각 하나는 빈 줄이 아니라 울타리(```) 줄의 끝이다.
        count -= (before is None) + (after is None)
        extra = count if (_is_text_line(before) and _is_text_line(after)) else count - 1
        out.append("")
        for _ in range(extra):
            out.extend([BLANK_MARK, ""])
    return "\n".join(out)


def markdown_to_html(text: str) -> str:
    """가져온 마크다운을 노트 HTML 로 바꾼다. 코드 블록 안은 건드리지 않는다."""
    parts = FENCED_CODE.split(text.replace("\r\n", "\n"))
    for index in range(0, len(parts), 2):
        parts[index] = _mark_blank_lines(parts[index], after_code=index > 0, before_code=index < len(parts) - 1)
    html = markdown("".join(parts), extensions=["fenced_code", "tables"])
    # 자리표 문단은 에디터의 빈 줄(빈 문단)로 되돌린다.
    return MARKED_PARAGRAPH.sub("<p></p>", html)
