import fitz

from app.core.pdf_renderer import _prepare_html, render_note_pdf


def _details(summary: str, body: str, open_: bool = True) -> str:
    return (f'<details class="details"{" open=\"\"" if open_ else ""}><summary>{summary}</summary>'
            f'<div data-type="detailsContent">{body}</div></details>')


def _pdf_text(content: str) -> str:
    document = fitz.open(stream=render_note_pdf(title="접기", content=content), filetype="pdf")
    return "".join(page.get_text() for page in document)


def test_title_only_details_drops_its_empty_body():
    # 제목만 적은 접기에 딸려 오는 빈 문단. 남겨 두면 세로선만 있는 빈 칸이 인쇄된다.
    for empty in ("<p></p>", "<p><br></p>", "<p> </p>"):
        html = _prepare_html(_details("제목만", empty))
        assert "detailsContent" not in html
        assert "<summary>제목만</summary>" in html


def test_details_with_a_body_keeps_it():
    html = _prepare_html(_details("제목", "<p>본문</p>"))

    assert '<div data-type="detailsContent"><p>본문</p></div>' in html


def test_closed_details_is_printed_expanded():
    # 종이에서는 펼 수 없으므로 닫아 둔 접기의 본문도 싣는다.
    text = _pdf_text(_details("닫아 둔 제목", "<p>닫아 둔 본문</p>", open_=False))

    assert "닫아 둔 제목" in text
    assert "닫아 둔 본문" in text


def test_details_without_a_title_is_labelled():
    assert "제목 없음" in _pdf_text(_details("", "<p>본문</p>"))


def test_empty_paragraphs_each_keep_a_line():
    # 빈 줄을 여러 개 두면 PDF 에서도 그만큼 비어야 한다. 빈 <p> 는 높이가 0 이라 한 줄로 뭉쳤다.
    html = _prepare_html('<p>위</p><p></p><p></p><p style="text-align: center"></p><p>아래</p>')

    assert html == ('<p>위</p><p>&nbsp;</p><p>&nbsp;</p>'
                    '<p style="text-align: center">&nbsp;</p><p>아래</p>')


def test_empty_lines_push_the_next_paragraph_down():
    def gap_below_first(content: str) -> float:
        document = fitz.open(stream=render_note_pdf(title="줄", content=content), filetype="pdf")
        page = document[0]
        top = page.search_for("위쪽")[0].y0
        return page.search_for("아래쪽")[0].y0 - top

    tight = gap_below_first("<p>위쪽</p><p>아래쪽</p>")
    three_blank = gap_below_first("<p>위쪽</p><p></p><p></p><p></p><p>아래쪽</p>")
    assert three_blank > tight * 3.5
