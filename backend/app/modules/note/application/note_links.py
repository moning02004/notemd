"""본문에 끼워 넣은 다른 노트 링크(<a data-note="...">)를 보는 사람 기준으로 다시 쓴다.

링크를 넣을 때의 제목이 본문에 같이 저장되므로, 그대로 내보내면
- 대상 노트의 제목을 바꿔도 옛 제목이 보이고
- 공개 노트 안에 든 비공개 노트의 제목이 누구에게나 드러난다.
그래서 노트를 내려줄 때마다 링크의 글자와 상태를 지금 대상 노트와 보는 사람의 권한으로 채운다.

HTML 전체를 파서로 다시 직렬화하면 에디터가 만든 다른 태그의 모양까지 바뀔 수 있어,
에디터가 만드는 모양(<a ... data-note="..." ...>제목</a>)만 골라 바꾼다.
"""

import html
import re
from enum import Enum

NOTE_LINK_PATTERN = re.compile(r'<a\b(?P<attrs>[^>]*\bdata-note="(?P<hash>[^"]+)"[^>]*)>(?P<text>.*?)</a>',
                               re.DOTALL)
STATE_ATTR_PATTERN = re.compile(r'\s+data-state="[^"]*"')


class NoteLinkState(str, Enum):
    OK = "ok"
    # 볼 수는 있지만 휴지통에 있다. 제목은 보여준다.
    DELETED = "deleted"
    # 비밀번호를 알아야 열리는 남의 노트. 제목도 비밀번호 뒤에 있다.
    LOCKED = "locked"
    # 없거나 볼 권한이 없다. 어느 쪽인지도 알려주지 않는다.
    UNAVAILABLE = "unavailable"


PLACEHOLDER_TITLES = {
    NoteLinkState.LOCKED: "잠긴 노트",
    NoteLinkState.UNAVAILABLE: "볼 수 없는 노트",
}


def note_link_hashes(content: str | None) -> list[str]:
    if not content or "data-note" not in content:
        return []
    return list(dict.fromkeys(match.group("hash") for match in NOTE_LINK_PATTERN.finditer(content)))


def rewrite_note_links(content: str, resolved: dict[str, tuple[NoteLinkState, str]],
                       keep_unresolved: bool = False) -> str:
    """resolved 에 없는 링크는 볼 수 없는 노트로 친다. keep_unresolved 면 글자는 그대로 두고 상태만 뗀다."""

    def replace(match: re.Match) -> str:
        if keep_unresolved and match.group("hash") not in resolved:
            return f"<a{STATE_ATTR_PATTERN.sub('', match.group('attrs'))}>{match.group('text')}</a>"

        state, title = resolved.get(match.group("hash"), (NoteLinkState.UNAVAILABLE, ""))
        text = PLACEHOLDER_TITLES.get(state) or title.strip() or "제목 없음"

        attrs = STATE_ATTR_PATTERN.sub("", match.group("attrs"))
        if state != NoteLinkState.OK:
            attrs += f' data-state="{state.value}"'
        return f"<a{attrs}>{html.escape(text, quote=False)}</a>"

    return NOTE_LINK_PATTERN.sub(replace, content)
