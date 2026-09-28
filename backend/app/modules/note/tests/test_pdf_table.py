from app.core.pdf_renderer import _prepare_html, render_note_pdf


def _colgroup(*cols: str) -> str:
    return (
        '<table style="min-width: 192px;"><colgroup>'
        + "".join(f'<col style="{col}">' for col in cols)
        + "</colgroup><tbody><tr><td><p>칸</p></td></tr></tbody></table>"
    )


def test_untouched_columns_are_left_to_fit_their_content():
    # 손대지 않은 열은 최소 폭만 적혀 있다. 폭으로 읽으면 PDF 에서 모두 같은 폭으로 굳는다.
    html = _prepare_html(_colgroup("min-width: 64px;", "min-width: 64px;"))

    assert "<colgroup>" not in html
    assert "64" not in html


def test_resized_columns_keep_their_ratio_and_the_rest_stay_auto():
    html = _prepare_html(_colgroup("width: 200px;", "min-width: 64px;"))

    # 맞춘 열은 비율로, 나머지 열은 폭을 비워 둔다(64px 몫으로 찌그러지지 않게).
    assert '<col style="width:29.41%"><col>' in html


def test_fully_resized_table_keeps_the_ratio_between_columns():
    html = _prepare_html(_colgroup("width: 100px;", "width: 300px;"))

    assert '<col style="width:25.00%"><col style="width:75.00%">' in html


def test_cell_alignment_and_background_survive_into_the_pdf_html():
    cell = ('<td data-background-color="#E3EEF8" '
            'style="text-align: center; background-color: rgb(227, 238, 248); vertical-align: bottom;">')
    html = _prepare_html(f"<table><tbody><tr>{cell}<p>칸</p></td></tr></tbody></table>")

    assert cell in html


def test_table_with_mixed_widths_renders():
    pdf = render_note_pdf("표", _colgroup("width: 975px;", "min-width: 64px;"))

    assert pdf.startswith(b"%PDF")
