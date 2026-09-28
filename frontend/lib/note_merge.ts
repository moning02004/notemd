/*
 * 같은 노트를 두 곳에서 고쳤을 때 합치기.
 *
 * 기준본(마지막으로 서버와 맞춰 둔 내용), 내 내용, 다른 곳 내용 셋을 블록(문단·제목·목록·표 …) 단위로
 * 견준다. 한쪽만 바꾼 곳은 그대로 받아들이고, 같은 곳을 양쪽이 다르게 바꾼 곳만 사람에게 묻는다(diff3).
 * 표는 통째로 한 블록이라, 같은 표를 양쪽에서 고치면 칸이 달라도 겹친 것으로 본다.
 */

export type MergeChunk =
    /** 양쪽 모두 그대로이거나, 양쪽이 똑같이 바꾼 곳 */
    | { kind: "same", blocks: string[] }
    /** 다른 곳에서만 바꾼 곳. 자동으로 받아들인다. */
    | { kind: "theirs", base: string[], theirs: string[] }
    /** 여기서만 바꾼 곳. 그대로 둔다. */
    | { kind: "mine", base: string[], mine: string[] }
    /** 양쪽이 다르게 바꾼 곳. 어느 쪽을 남길지 고른다. */
    | { kind: "conflict", base: string[], mine: string[], theirs: string[] }

export type ConflictChoice = "theirs" | "mine" | "both"

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((value, index) => value === b[index])

/**
 * a 의 각 블록이 b 의 몇 번째와 짝인지(없으면 -1). 가장 긴 공통 부분열로 짝짓는다.
 * 고친 곳은 보통 한군데라, 앞뒤로 같은 부분을 먼저 떼어 내 표를 작게 만든다.
 */
function matchBlocks(a: string[], b: string[]): number[] {
    const match = new Array<number>(a.length).fill(-1)

    let start = 0
    while (start < a.length && start < b.length && a[start] === b[start]) {
        match[start] = start
        start++
    }
    let endA = a.length
    let endB = b.length
    while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
        endA--
        endB--
        match[endA] = endB
    }

    const n = endA - start
    const m = endB - start
    if (n === 0 || m === 0) return match

    // lengths[i][j] = a[start+i..] 와 b[start+j..] 의 공통 부분열 길이
    const width = m + 1
    const lengths = new Int32Array((n + 1) * width)
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            lengths[i * width + j] = a[start + i] === b[start + j]
                ? lengths[(i + 1) * width + j + 1] + 1
                : Math.max(lengths[(i + 1) * width + j], lengths[i * width + j + 1])
        }
    }
    let i = 0
    let j = 0
    while (i < n && j < m) {
        if (a[start + i] === b[start + j]) {
            match[start + i] = start + j
            i++
            j++
        } else if (lengths[(i + 1) * width + j] >= lengths[i * width + j + 1]) {
            i++
        } else {
            j++
        }
    }
    return match
}

/** 기준본·내 것·다른 곳 블록 목록을 합칠 조각으로 나눈다. */
export function diff3(base: string[], mine: string[], theirs: string[]): MergeChunk[] {
    const toMine = matchBlocks(base, mine)
    const toTheirs = matchBlocks(base, theirs)
    const chunks: MergeChunk[] = []

    const pushSame = (blocks: string[]) => {
        if (blocks.length === 0) return
        const last = chunks[chunks.length - 1]
        if (last?.kind === "same") last.blocks.push(...blocks)
        else chunks.push({kind: "same", blocks: [...blocks]})
    }

    let previousBase = -1
    let previousMine = -1
    let previousTheirs = -1

    // 세 쪽 모두에 남아 있는 기준본 블록을 닻으로 삼아, 닻 사이마다 누가 무엇을 바꿨는지 본다.
    // 맨 끝에는 세 목록의 끝을 닻으로 둔다.
    for (let index = 0; index <= base.length; index++) {
        const isEnd = index === base.length
        if (!isEnd && (toMine[index] < 0 || toTheirs[index] < 0)) continue
        const mineAt = isEnd ? mine.length : toMine[index]
        const theirsAt = isEnd ? theirs.length : toTheirs[index]
        // 두 짝짓기가 서로 엇갈리면 닻으로 쓰지 않는다(순서가 뒤바뀐 경우).
        if (!isEnd && (mineAt <= previousMine || theirsAt <= previousTheirs)) continue

        const baseSpan = base.slice(previousBase + 1, index)
        const mineSpan = mine.slice(previousMine + 1, mineAt)
        const theirsSpan = theirs.slice(previousTheirs + 1, theirsAt)

        if (baseSpan.length || mineSpan.length || theirsSpan.length) {
            const mineChanged = !sameList(mineSpan, baseSpan)
            const theirsChanged = !sameList(theirsSpan, baseSpan)
            if (!mineChanged && !theirsChanged) pushSame(baseSpan)
            else if (!mineChanged) chunks.push({kind: "theirs", base: baseSpan, theirs: theirsSpan})
            else if (!theirsChanged) chunks.push({kind: "mine", base: baseSpan, mine: mineSpan})
            else if (sameList(mineSpan, theirsSpan)) pushSame(mineSpan)
            else chunks.push({kind: "conflict", base: baseSpan, mine: mineSpan, theirs: theirsSpan})
        }

        if (!isEnd) pushSame([base[index]])
        previousBase = index
        previousMine = mineAt
        previousTheirs = theirsAt
    }
    return chunks
}

/** 조각들을 하나로 합친다. 겹친 곳은 choices(조각 번호 → 고른 쪽)를 따르고, 고르지 않았으면 둘 다 남긴다. */
export function applyMerge(chunks: MergeChunk[], choices: Record<number, ConflictChoice>): string[] {
    return chunks.flatMap((chunk, index) => {
        switch (chunk.kind) {
            case "same":
                return chunk.blocks
            case "theirs":
                return chunk.theirs
            case "mine":
                return chunk.mine
            case "conflict": {
                const choice = choices[index] ?? "both"
                if (choice === "theirs") return chunk.theirs
                if (choice === "mine") return chunk.mine
                return [...chunk.mine, ...chunk.theirs]
            }
        }
    })
}

/**
 * 본문 HTML 을 맨 위 단계의 블록 HTML 목록으로 나눈다.
 * 세 쪽을 같은 방식으로 다시 써서(브라우저가 정리한 모양) 속성 순서 같은 차이로 다르게 보이지 않게 한다.
 */
export function htmlBlocks(html: string): string[] {
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html")
    return [...doc.body.childNodes].flatMap(node => {
        if (node.nodeType === Node.ELEMENT_NODE) return [(node as Element).outerHTML]
        const text = node.textContent?.trim()
        return text ? [text] : []
    })
}

/** 제목은 한 줄이라 통째로 견준다. 양쪽이 다르게 바꿨으면 conflict. */
export function mergeTitle(base: string, mine: string, theirs: string) {
    if (mine === theirs || theirs === base) return {title: mine, theirsChanged: false, conflict: false}
    if (mine === base) return {title: theirs, theirsChanged: true, conflict: false}
    return {title: mine, theirsChanged: true, conflict: true}
}
