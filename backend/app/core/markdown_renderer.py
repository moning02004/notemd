"""노트 HTML 을 마크다운으로 바꾼다(노트 다운로드·데이터 내보내기).

markdownify 를 그대로 쓰면 에디터에서 비워 둔 줄이 사라진다.
- 빈 문단(Enter 를 여러 번 친 줄)은 마크다운에서 연달은 빈 줄이 하나로 합쳐져 흔적이 없다.
- 줄바꿈(<br>)은 줄 끝 공백 두 칸이 되는데, <br> 로 비운 줄은 공백만 남아 문단 구분으로 읽힌다.
비운 줄마다 &nbsp; 를 두어 한 줄씩 남긴다. 마크다운을 가져올 때(노트 만들기) 빈 줄을 &nbsp; 로 적는 것과 같은 규칙이라
내보낸 파일을 다시 가져와도 줄이 그대로다.
"""
import re

from markdownify import markdownify

from app.core.pdf_renderer import EMPTY_DETAILS_BODY, EMPTY_PARAGRAPH

# 다른 줄바꿈이나 문단 끝이 바로 뒤따르는 <br>: 그 사이 줄이 비어 있다.
BLANK_AFTER_BREAK = re.compile(r"<br\s*/?>(?=\s*(?:<br\b|</p>))")
# 비운 줄 자리표. &nbsp; 를 바로 넣으면 markdownify 가 공백으로 여겨 깎아 버린다(빈 문단이 통째로 사라진다).
# 마크다운에서 escape 될 글자가 없는 낱말로 두고, 바꾼 뒤에 &nbsp; 로 되돌린다.
BLANK_MARK = "mdnoteblanklinemark"


def html_to_markdown(content: str | None) -> str:
    content = content or ""
    # 제목만 적은 접기에 딸려 오는 빈 본문은 빈 줄로 남길 까닭이 없다(PDF 와 같다).
    content = EMPTY_DETAILS_BODY.sub("", content)
    content = EMPTY_PARAGRAPH.sub(rf"<p\1>{BLANK_MARK}</p>", content)
    content = BLANK_AFTER_BREAK.sub(f"<br>{BLANK_MARK}", content)
    return markdownify(content).replace(BLANK_MARK, "&nbsp;")
