import {NoteMenu} from "@/components/note_menu"
import {DeletedMenu} from "@/components/deleted_menu"
import DOMPurify from "dompurify"
import {FiCheck} from "react-icons/fi"
import {LuEllipsisVertical} from "react-icons/lu"
import {FiFolder, FiInbox} from "react-icons/fi";
import {startNoteDrag} from "@/lib/note_drag";
import {Spinner} from "@/components/icons";

type NoteType = {
    onClick?: React.MouseEventHandler<HTMLDivElement>
    hashId: string
    title: string
    content: string
    ownerName?: string
    isOwner?: boolean
    isPublic?: boolean
    isProtected?: boolean
    isShared?: boolean
    isEncrypted?: boolean
    isPassword?: boolean
    created_at?: string
    deleted_at?: string
    noteMenu?: boolean
    deletedMenu?: boolean
    selectable?: boolean
    selected?: boolean
    onSelect?: (id: string) => void
    viewMode?: "card" | "list"
    /** 눌러서 노트를 여는 중. 눌린 칸이 바로 반응하도록 이 칸에도 표시한다. */
    isOpening?: boolean
    /** 목록이 여러 폴더를 섞어 보여줄 때만 경로를 붙인다(루트, 검색, 하위 포함). */
    folderPath?: string | null
    /** 폴더에 들어 있지 않은 노트. 경로 대신 '미분류' 아이콘을 쓴다. */
    folderUnfiled?: boolean
    folderHash?: string | null
    draggable?: boolean
}

export const Note = ({
                         onClick,
                         hashId,
                         title,
                         content,
                         ownerName,
                         isOwner,
                         isPublic,
                         isProtected,
                         isShared,
                         isEncrypted,
                         isPassword,
                         created_at,
                         deleted_at,
                         noteMenu,
                         deletedMenu,
                         selectable,
                         selected,
                         onSelect,
                         viewMode = "card",
                         isOpening,
                         folderPath,
                         folderUnfiled,
                         folderHash,
                         draggable,
                     }: NoteType) => {
    const isUntitled = !title?.trim()
    const displayTitle = isUntitled ? "제목 없음" : title

    // "2026-08-21 11:18" -> 좁은 화면에서는 날짜만. 고정 폭 칸에 우겨넣으면 두 줄로 접힌다.
    const [stampDate, stampTime] = (created_at || deleted_at || "").split(" ")

    // 미리보기는 서식 없이 본문 텍스트만 보여준다
    const preview = DOMPurify.sanitize(content ?? "", {ALLOWED_TAGS: [], ALLOWED_ATTR: []})
        .replace(/\s+/g, " ")
        .trim()

    /*
     * 상태는 글자로 적는다.
     *
     * 자물쇠·방패·열쇠 계열 아이콘 다섯 개는 12px 에서 서로 구분되지 않아
     * 무엇이 켜져 있는지 알려면 결국 설정을 열어봐야 했다. 두 글자면 바로 읽힌다.
     */
    const statuses = [
        isPublic && {label: "공개", title: "링크가 있는 누구나 볼 수 있어요", tone: "open"},
        isProtected && {label: "보호", title: "편집과 삭제가 제한돼요", tone: "guard"},
        isShared && {label: "공유", title: "워크스페이스에 공유된 노트예요", tone: "share"},
        isEncrypted && {label: "암호화", title: "암호화되어 저장돼요", tone: "lock"},
        isPassword && {label: "비번", title: "열 때 비밀번호를 확인해요", tone: "lock"},
    ].filter(Boolean) as Status[]

    function handleClick(e: React.MouseEvent<HTMLDivElement>) {
        if (selectable) {
            onSelect?.(hashId)
        } else {
            onClick?.(e)
        }
    }

    if (viewMode === "list") {
        return (
            <div
                data-note-id={hashId}
                onClick={handleClick}
                draggable={draggable && !selectable}
                onDragStart={event => startNoteDrag(event, hashId, displayTitle, preview)}
                aria-busy={isOpening}
                className={`
                    flex items-center gap-3 px-3 py-2.5 border-b border-border
                    transition-colors cursor-pointer
                    ${selected ? "bg-accent-soft" : "hover:bg-background"}
                    ${isOpening ? "bg-background" : ""}
                `}
            >
                {isOpening && <Spinner size={14} className="text-accent"/>}
                {selectable && (
                    <div className={`
                        shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-150
                        ${selected ? "bg-accent" : "border border-border-strong bg-surface"}
                    `}>
                        {selected && <FiCheck size={11} className="text-white stroke-[3]"/>}
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    {/*
                      제목 위 한 줄에 '이 노트가 어디의 무엇인지'를 모은다.
                      아이콘을 텍스트 칼럼 바깥에 두면 경로·제목·본문의 왼쪽 선과
                      어긋나 떠 보이고, 오른쪽에 두면 제목이 밀려 잘린다.
                    */}
                    {folderPath && (
                        <p className="flex items-center gap-2 text-[11px] leading-tight text-subtle">
                            {folderPath && (
                                <span className="flex items-center gap-1 min-w-0">
                                    {folderUnfiled
                                        ? <FiInbox size={10} className="shrink-0"/>
                                        : <FiFolder size={10} className="shrink-0"/>}
                                    <span className="truncate">{folderPath}</span>
                                </span>
                            )}

                        </p>
                    )}
                    <p className={`truncate text-sm font-medium ${isUntitled ? "text-subtle" : "text-foreground"}`}>
                        {displayTitle}
                    </p>
                    {/* 카드와 같은 순서(제목 -> 상태 -> 본문)로 둔다. */}
                    {statuses.length > 0 && (
                        <p className="flex flex-wrap items-center gap-1 my-0.5">
                            {statuses.map(status => <StatusChip key={status.label} {...status}/>)}
                        </p>
                    )}
                    <p className="truncate text-xs text-subtle">
                        {preview || "아직 아무것도 쓰지 않았어요"}
                    </p>
                </div>

                {ownerName && (
                    <span className="shrink-0 hidden sm:block w-24 truncate text-right text-xs text-subtle">
                        {ownerName}
                    </span>
                )}

                <span className="shrink-0 text-right text-xs text-subtle whitespace-nowrap tabular-nums">
                    {stampDate}
                    {stampTime && <span className="hidden sm:inline"> {stampTime}</span>}
                </span>

                {!selectable && (noteMenu || deletedMenu) && (
                    <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                        {noteMenu && (
                            <NoteMenu
                                noteId={hashId}
                                canDelete={!isProtected && isOwner}
                                canDownload={isOwner}
                                currentFolder={folderHash}
                                trigger={
                                    <button
                                        className="p-1 rounded hover:bg-accent-soft text-accent sm:text-muted cursor-pointer">
                                        <LuEllipsisVertical size={13}/>
                                    </button>
                                }
                            />
                        )}
                        {deletedMenu && (
                            <DeletedMenu
                                noteId={hashId}
                                trigger={
                                    <button className="p-1 rounded hover:bg-accent-soft text-muted cursor-pointer">
                                        <LuEllipsisVertical size={16}/>
                                    </button>
                                }
                            />
                        )}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div
            data-note-id={hashId}
            onClick={handleClick}
            draggable={draggable && !selectable}
            onDragStart={event => startNoteDrag(event, hashId, displayTitle, preview)}
            aria-busy={isOpening}
            className={`
                group relative flex flex-col min-h-[11.5rem] p-3.5 rounded-xl border bg-surface
                transition-all duration-150 cursor-pointer
                ${selected
                ? "border-accent bg-accent-soft"
                : "border-border hover:border-border-strong hover:shadow-[0_8px_18px_-12px_rgba(0,0,0,0.25)]"
            }
            `}
        >
            {/*
              왼쪽 위 모서리 표시.
              뜻은 아래 칩이 담고, 이건 '무언가 걸려 있는 노트'를 멀리서 알아보는 표시다.
              제목은 패딩(14px) 안쪽에서 시작하고 ⋯ 메뉴는 오른쪽 위라 둘 다 비켜간다.
            */}
            {statuses.length > 0 && (
                <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none" aria-hidden>
                    <span className="absolute top-0 left-0 border-t-[16px] border-r-[16px]
                                     border-t-accent border-r-transparent"/>
                </div>
            )}

            {/* 카드를 눌러 노트를 여는 동안. 카드가 눌린 걸 알 수 있게 그 자리에서 표시한다. */}
            {isOpening && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-surface/70">
                    <Spinner size={22} className="text-accent"/>
                </div>
            )}
            {selected && (
                <div className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r bg-accent"/>
            )}

            {selectable && (
                <div className={`
                    absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center
                    transition-all duration-150 z-10
                    ${selected ? "bg-accent" : "border border-border-strong bg-surface"}
                `}>
                    {selected && <FiCheck size={11} className="text-white stroke-[3]"/>}
                </div>
            )}

            {/* 케밥 버튼(약 27px)이 절대 위치로 떠 있다. 여백이 모자라면 제목 위로 겹친다. */}
            <div className="mb-1.5 pr-7">
                <p className={`text-sm font-medium leading-snug line-clamp-2 ${isUntitled ? "text-subtle" : "text-foreground"}`}>
                    {displayTitle}
                </p>
            </div>

            {/* 제목 바로 아래. 제목과 한 덩어리로 읽히도록 제목의 왼쪽 선에 맞춘다. */}
            {statuses.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mb-1.5">
                    {statuses.map(status => <StatusChip key={status.label} {...status}/>)}
                </div>
            )}

            <p className={`flex-1 text-xs leading-relaxed line-clamp-4 ${preview ? "text-muted" : "text-subtle italic"}`}>
                {preview || "아직 아무것도 쓰지 않았어요"}
            </p>

            <div className="flex flex-col gap-1 mt-3">
                {/* 날짜와 같은 줄에 두면 좁은 카드에서 폴더 이름이 통째로 밀려 사라진다. */}
                {folderPath && (
                    <span className="flex items-center gap-1 self-end max-w-full text-[11px] text-accent
                                     bg-accent-soft px-2 py-0.5 rounded">
                        {folderUnfiled
                            ? <FiInbox size={10} className="shrink-0"/>
                            : <FiFolder size={10} className="shrink-0"/>}
                        <span className="min-w-0 truncate">{folderPath}</span>
                    </span>
                )}
                {/*
                  상태 아이콘은 날짜와 같은 '부가 정보'다. 제목 앞에 두면 아이콘 수만큼
                  제목 시작점이 밀리고, 제목 위에 한 줄로 빼면 카드마다 제목 높이가 어긋난다.
                  이미 있는 아래 메타 줄에 묶으면 제목·본문은 늘 같은 자리에서 시작한다.
                */}
                {/*
                  좁은 카드(폰 2열이면 약 170px)에서는 아이콘 + 날짜가 한 줄에 들어가지 않는다.
                  둘 다 줄일 수 없는 것들이라 줄바꿈으로 흘려보낸다. 날짜는 ml-auto 라
                  아래로 내려가도 오른쪽에 붙는다.
                */}
                <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                    {ownerName && (
                        <span className="text-[11px] text-subtle truncate max-w-[7rem]">{ownerName}</span>
                    )}
                    <span className="text-[11px] text-subtle shrink-0">{created_at || deleted_at}</span>
                </div>
            </div>

            {!selectable && (
                <div onClick={(e) => e.stopPropagation()}
                     className="absolute top-1.5 right-1.5 lg:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {noteMenu ? <NoteMenu noteId={hashId}
                                          canDelete={!isProtected && isOwner}
                                          canDownload={isOwner}
                                          currentFolder={folderHash}
                        />
                        : deletedMenu ? <DeletedMenu noteId={hashId}/> : ""}
                </div>
            )}
        </div>
    )
}

type Status = { label: string, title: string, tone: keyof typeof CHIP_TONES }

/*
 * 색은 뜻이 비슷한 것끼리 묶는다. 다섯 개를 전부 다른 색으로 칠하면 카드가 알록달록해져
 * 오히려 무엇이 중요한지 안 보인다. 클래스는 Tailwind 가 읽을 수 있게 통째로 적는다.
 */
const CHIP_TONES = {
    open: "bg-chip-open-soft text-chip-open",     // 밖으로 열림
    share: "bg-chip-share-soft text-chip-share",  // 함께 봄
    lock: "bg-chip-lock-soft text-chip-lock",     // 잠김
    guard: "bg-accent-soft text-accent",          // 편집 제한
} as const

/** 노트 상태를 적는 작은 칩. */
function StatusChip({label, title, tone}: Status) {
    return (
        <span title={title}
              className={`shrink-0 rounded-lg px-1.5 text-[10px] leading-[1.6] font-medium
                          whitespace-nowrap ${CHIP_TONES[tone]}`}>
            {label}
        </span>
    )
}
