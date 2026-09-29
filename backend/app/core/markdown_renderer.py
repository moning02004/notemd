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
from markdownify import MarkdownConverter, re_line_with_content

from app.core.pdf_renderer import EMPTY_DETAILS_BODY

LINE_BREAK = "  \n"
LIST_INDENT = " " * 4
# 항목 글과 바로 뒤따르는 하위 목록 사이의 빈 줄. 에디터의 항목은 <li><p>…</p><ul>…</ul></li> 라 문단 뒤에 빈 줄이 붙는다.
BLANK_BEFORE_SUBLIST = re.compile(r"\n\n(?=\s*(?:[-*+]|\d+\.) )")
# 강조로 읽힐 수 있는 밑줄: 글자(문자·숫자) 사이에 끼어 있지 않은 것. ADMIN_KEY, snake_case 는 강조가 되지 않는다.
# \w 는 밑줄 자신도 글자로 쳐서 __굵게__ 의 두 번째 밑줄을 놓치므로 [^\W_] 로 문자·숫자만 본다.
EMPHASIS_UNDERSCORE = re.compile(r"(?<![^\W_])_|_(?![^\W_])")


class NoteMarkdownConverter(MarkdownConverter):
    """하위 목록을 네 칸 들여 쓴다.

    markdownify 는 불릿 폭만큼(- 는 두 칸) 들여 쓰는데, 가져오기에 쓰는 python-markdown 은 네 칸부터
    하위 목록으로 읽어 두 칸짜리는 한 단계로 납작해졌다. 네 칸은 CommonMark·GitHub·Obsidian 에서도 하위 목록이다.
    """

    def escape(self, text, parent_tags):
        """밑줄은 강조로 읽힐 수 있을 때만 \\_ 로 적는다. markdownify 는 모든 밑줄 앞에 \\ 를 붙여 파일에서
        ADMIN\\_KEY 처럼 보였다. 글자 사이의 밑줄은 CommonMark·python-markdown 모두 강조로 읽지 않는다."""
        text = super().escape(text, parent_tags)
        return EMPHASIS_UNDERSCORE.sub(r"\\_", text)

    def convert_li(self, el, text, parent_tags):
        text = BLANK_BEFORE_SUBLIST.sub("\n", (text or "").strip())
        if not text:
            return "\n"
        parent = el.parent
        if parent is not None and parent.name == "ol":
            start = int(parent["start"]) if str(parent.get("start", "")).isnumeric() else 1
            bullet = f"{start + len(el.find_previous_siblings('li'))}. "
        else:
            bullet = "- "
        text = re_line_with_content.sub(lambda m: LIST_INDENT + m.group(1) if m.group(1) else "", text)
        return f"{bullet}{text[len(LIST_INDENT):]}\n"


def markdownify(html: str) -> str:
    return NoteMarkdownConverter(heading_style="ATX", escape_underscores=False).convert(html)


def _is_blank_line(block: Tag) -> bool:
    """에디터에서 비워 둔 줄(빈 문단). 글자도 이미지도 없다."""
    return block.name == "p" and not block.get_text(strip=True) and block.find("img") is None


def _mark_task_items(soup: BeautifulSoup) -> None:
    """체크리스트 항목 앞에 [x] / [ ] 를 적어 둔다. markdownify 는 보통 목록('- 한 일')으로만 바꾼다.

    에디터의 모양: <li data-type="taskItem" data-checked="true"><label><input …></label><div><p>한 일</p>…</div></li>
    """
    for item in soup.select('li[data-type="taskItem"]'):
        mark = "[x] " if item.get("data-checked") == "true" else "[ ] "
        for label in item.find_all("label", recursive=False):
            label.decompose()
        for wrapper in item.find_all("div", recursive=False):
            wrapper.unwrap()
        first = item.find("p")
        (first or item).insert(0, NavigableString(mark))
        # 접기 본문은 한 번 더 이 함수를 거친다. 표시를 뗀 항목은 다시 [x] 를 달지 않는다.
        del item["data-type"]


def _details_markdown(details: Tag) -> str:
    """접기는 <details><summary> HTML 로 남긴다. GitHub·Obsidian 에서도 접히고, 가져올 때 다시 접기가 된다.

    본문은 같은 규칙의 마크다운으로 바꾼다(md_in_html 이 읽을 수 있게 앞뒤를 빈 줄로 띄운다).
    """
    summary = details.find("summary")
    title = summary.decode_contents().strip() if summary else ""
    body = details.find("div", attrs={"data-type": "detailsContent"})
    opening = "<details open>" if details.has_attr("open") else "<details>"
    lines = [opening, f"<summary>{title}</summary>"]
    body_markdown = html_to_markdown(body.decode_contents()).strip("\n") if body else ""
    if body_markdown:
        lines += ["", body_markdown, ""]
    lines.append("</details>")
    return "\n".join(lines)


def html_to_markdown(content: str | None) -> str:
    # 제목만 적은 접기에 딸려 오는 빈 본문은 빈 줄로 남길 까닭이 없다(PDF 와 같다).
    content = EMPTY_DETAILS_BODY.sub("", content or "")
    soup = BeautifulSoup(content, "html.parser")
    _mark_task_items(soup)

    parts: list[str] = []
    previous: str | None = None  # 앞 블록의 종류: "text"(글 문단) 또는 "block"
    blank_lines = 0

    for node in soup.contents:
        if isinstance(node, NavigableString):
            if not node.strip():
                continue
            kind, markdown = "text", markdownify(str(node)).strip()
        elif _is_blank_line(node):
            if previous is not None:  # 맨 앞의 빈 줄은 버린다.
                blank_lines += 1
            continue
        elif node.name == "details":
            kind, markdown = "block", _details_markdown(node)
        else:
            kind = "text" if node.name == "p" else "block"
            markdown = markdownify(str(node)).strip("\n")

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


DETAILS_OPEN_TAG = re.compile(r"<details(?=[\s>])")
TASK_MARK = re.compile(r"^\s*\[([ xX])\]\s+")
BLOCK_TAGS = {"p", "ul", "ol", "pre", "blockquote", "table", "details", "h1", "h2", "h3", "h4", "h5", "h6"}


def _to_task_lists(soup: BeautifulSoup) -> None:
    """'- [x] 한 일' 로 된 목록을 에디터의 체크리스트로 바꾼다. 항목이 모두 체크 표시로 시작할 때만."""
    for ul in soup.find_all("ul"):
        items = ul.find_all("li", recursive=False)
        if not items or not all(TASK_MARK.match(item.get_text()) for item in items):
            continue
        ul["data-type"] = "taskList"
        for item in items:
            text = item.find(string=lambda value: value.strip())
            checked = TASK_MARK.match(text).group(1) in "xX"
            text.replace_with(TASK_MARK.sub("", text, count=1))
            item["data-type"] = "taskItem"
            item["data-checked"] = "true" if checked else "false"
            # 체크리스트 항목은 문단으로 시작해야 한다. 목록이 촘촘하면 글자가 <li> 에 바로 들어 있다.
            if item.contents and getattr(item.contents[0], "name", None) != "p":
                paragraph = soup.new_tag("p")
                while item.contents and getattr(item.contents[0], "name", None) not in BLOCK_TAGS:
                    paragraph.append(item.contents[0].extract())
                item.insert(0, paragraph)


def _to_editor_details(soup: BeautifulSoup) -> None:
    """<details> 의 summary 뒤 내용을 에디터의 접기 본문(div[data-type=detailsContent])으로 감싼다."""
    for details in soup.find_all("details"):
        summary = details.find("summary", recursive=False) or soup.new_tag("summary")
        body = soup.new_tag("div", attrs={"data-type": "detailsContent"})
        for child in list(details.contents):
            if child is not summary:
                body.append(child.extract())
        if not body.get_text(strip=True) and body.find(["img", "table", "pre"]) is None:
            body.clear()
            body.append(soup.new_tag("p"))
        details.clear()
        details.append(summary)
        details.append(body)
        if details.has_attr("open"):
            details["open"] = ""


def markdown_to_html(text: str) -> str:
    """가져온 마크다운을 노트 HTML 로 바꾼다. 코드 블록 안은 건드리지 않는다.

    체크리스트('- [x]')와 접기(<details><summary>)는 에디터의 모양으로 되돌린다. 접기 안의 마크다운도 읽도록
    md_in_html 에 markdown="1" 을 붙여 넘긴다.
    """
    parts = FENCED_CODE.split(text.replace("\r\n", "\n"))
    for index in range(0, len(parts), 2):
        parts[index] = _mark_blank_lines(parts[index], after_code=index > 0, before_code=index < len(parts) - 1)
        parts[index] = DETAILS_OPEN_TAG.sub('<details markdown="1"', parts[index])
    html = markdown("".join(parts), extensions=["fenced_code", "tables", "md_in_html", "sane_lists"])
    # 자리표 문단은 에디터의 빈 줄(빈 문단)로 되돌린다.
    html = MARKED_PARAGRAPH.sub("<p></p>", html)

    if "<details" not in html and not re.search(r"<li>\s*(?:<p>)?\s*\[[ xX]\]", html):
        return html
    soup = BeautifulSoup(html, "html.parser")
    _to_task_lists(soup)
    _to_editor_details(soup)
    return str(soup)
