"use client"

import LeftMenu from "@/components/leftMenu";
import { useEditStore } from "@/store/editor";
import { useNoteStore } from "@/store/note";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FiToggleLeft, FiToggleRight, FiX } from "react-icons/fi";
import { AiOutlineLeft, AiOutlineRight } from "react-icons/ai";


const Editor = dynamic(() => import("@/components/editor"), {
  ssr: false,
});

export default function () {
  const { isOpenedSetting, setOpenedSetting } = useEditStore();
  const { url } = useNoteStore();
  const [isPublic, setIsPublic] = useState(false);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const editPermissionRef = useRef(null);

  const changeEditPermission = () => {
    let tag = editPermissionRef.current
    console.log("수정권한 update api to ", tag.value)
  }

  const toggleIsPublic = () => {
    if (isPublic) {
      console.log("공개 update api")
    }
  }

  function ToggleSideButton() {
    let size = 28

    return (
      <button id="isOpenToggle" onClick={() => setIsPublic(!isPublic)}>
        {isPublic ? <FiToggleRight className="bg-blue" size={size} /> : <FiToggleLeft size={size} />}
      </button>
    );
  }

  const handdleContent = (values: {title: string, content: object}) => {
    console.log(values.title)
    console.log(values.content)
  }

  return (
    <>
        <div className="flex w-full h-[100%]" onClick={() => setOpenedSetting(false)}>
          <Editor onChange={handdleContent} />
        </div>
      {
        <div className={`w-[25vw] bg-white fixed right-0 top-0 h-screen border-l border-[#ededed] shadow-xl
          transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${isOpenedSetting ? "translate-x-0" : "translate-x-full"}`}>
            <div className="flex flex-col p-5 w-full">
              <div className="flex flex-row justify-between mb-5">
                <h5 className="font-bold">노트 설정</h5>
                <button onClick={() => setOpenedSetting(false)} className="my-auto text-center hover:bg-gray-100 cursor-pointer"><FiX size={22} /></button>
              </div>

              <div className="min-h-[7rem]">
                <div className="flex flex-row justify-between">
                  <label className="flex-1" htmlFor="isOpenToggle">외부 공개</label>
                  <ToggleSideButton />
                </div>
                { isPublic && <input type="text" value={url} className="border w-full p-2 mt-1 rounded border-[#ededed] outline-none bg-gray-100" readOnly />}
              </div>

              <div className="flex flex-col">
                <span>편집 권한</span>
                <select className="p-2 border rounded mt-1 border-[#ededed] bg-[#fff6f6]" ref={editPermissionRef} onChange={changeEditPermission}>
                  <option value="">소유자만</option>
                  <option value="">소유자 + 그룹원</option>
                </select>
              </div>
            </div>
        </div>
      }
    </>
  );
}
