import {NoteListSkeleton} from "@/components/skeleton"

/**
 * 메뉴를 누른 즉시 화면이 바뀌게 하는 경계.
 *
 * 이 파일이 없으면 다음 화면이 준비될 때까지 React 가 이전 화면을 그대로 붙들고 있어서,
 * 눌러도 메뉴 강조조차 옮겨가지 않아 버벅이는 것처럼 보인다. 여기에 뼈대를 두면
 * 이동이 곧바로 반영되고 내용만 뒤이어 채워진다.
 *
 * (개인 노트 '/' 에는 두지 않는다. 폴더·태그를 고를 때마다 쿼리만 바뀌는데,
 *  그때도 이 경계가 열려 목록 전체가 한 번 사라져 보이기 때문이다.)
 */
export default function Loading() {
    return <NoteListSkeleton/>
}
