

export const TemplateApplyModal = ({templateList, cancel, apply}) => {
    return (
        <div className="absolute left-0 top-0 bg-[#dedede]/50 w-full h-screen">
            <div
                className="absolute flex flex-col left-[50%] top-[50%] border rounded bg-white w-[40%] h-[95%] opacity-100 translate-[-50%]">
                <div className="p-3">템플릿 목록</div>
                {!templateList.length && <div className="p-3">저장된 템플릿이 없습니다.</div>}
                {templateList.length > 0 && (
                    <>
                        <div className="flex-2 p-3">

                            <div className="flex flex-col w-[100%] ">
                                {templateList && templateList.map((x, index) => {
                                    return (
                                        <div key={index}
                                             className="flex flex-row p-3 border-b border-[#ededed] cursor-pointer hover:bg-[#dedede]">
                                            <div className="">{x.id}</div>
                                            <div className="flex-1 pl-3">{x.name}</div>
                                            <div className="flex-3">{x.description}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="flex-3 p-3 flex flex-col">
                            <div className=""></div>
                            <div className="flex-1 border rounded m-1 overflow-scroll p-3 shadow-inner">템플릿을 선택해주세요.
                            </div>
                        </div>
                    </>
                )}
                <div className="p-3 flex flex-row gap-2">
                    <div className="w-full rounded p-1.5 border text-center" onClick={cancel}>취소</div>
                    <div className="w-full rounded p-1.5 border text-center" onClick={() => apply("# 제목을")}>적용</div>
                </div>
            </div>
        </div>
    )
}