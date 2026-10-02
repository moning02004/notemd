/*
 * 위에 띄우는 말풍선(서식·이미지)이 편집 화면 위쪽에 붙박인 툴바와 겹치지 않게 한다.
 *
 * 말풍선은 body 에 붙어 z-index 로는 툴바보다 위지만, 브라우저에 따라(운영의 일부 환경) 스크롤 영역 안의 sticky 툴바가
 * 따로 그려져 말풍선을 덮는다. 순서에 기대지 않고 툴바 아래 끝까지를 쓸 수 없는 자리로 쳐서, 위에 자리가 모자라면
 * 고른 글 아래로 뒤집는다(Floating UI flip 의 padding). 툴바 위치는 스크롤에 따라 달라지므로 그릴 때마다 잰다.
 */
export function flipBelowToolbar(toolbar: () => HTMLElement | null) {
    return () => ({padding: {top: (toolbar()?.getBoundingClientRect().bottom ?? 0) + 4}})
}
