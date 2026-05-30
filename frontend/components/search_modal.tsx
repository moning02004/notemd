import {useEffect, useRef, useState} from "react";
import {FiArrowLeft, FiX} from "react-icons/fi";
import {apiRequest} from "@/lib/api";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const SearchModal = (
    {isOpen, onClose}: Props) => {

    const [keyword, setKeyword] = useState("")

    useEffect(() => {
        if (!isOpen) return;
    }, [isOpen])

    useEffect(() => {
        if (keyword === "") return;

        const timer = setTimeout(async () => {
            console.log(123)
        }, 500);

        return () => clearTimeout(timer);
    }, [keyword])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={onClose}/>

            <div className="relative bg-white md:rounded-xl shadow-2xl w-full max-w-2xl md:mx-4 flex flex-col md:h-[90vh] h-[100vh]">
                <div className="flex items-center justify-between py-4 border-b border-gray-100">
                    <button onClick={onClose} className="md:hidden block p-3 hover:bg-gray-100 rounded-md transition-colors">
                        <FiArrowLeft size={20}/>
                    </button>
                    <input onKeyUp={(e) => setKeyword(e.currentTarget.value)}
                           className="w-full py-2 border-b outline-0 mx-3"
                           placeholder="검색"
                           autoFocus={true}
                    />
                </div>

                <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="hover:bg-gray-100 w-full border-b border-gray-200 p-3">
                        <div className="flex flex-row">
                            <div className="flex-5 border-r border-gray-200">
                                <div className="font-bold">ㅁㅁㅁㅁ</div>
                                <div className="overflow-y-hidden h-[3rem] pr-1">12312312123 123123123123 12312312 3123123 12312312123 123123123123 12312312 3123123 12312312123 123123123123 12312312 3123123 12312312123 123123123123 12312312 3123123 12312312123 123123123123 12312312 3123123 12312312123 123123123123 12312312 3123123 12312312123 123123123123 12312312 3123123 </div>
                            </div>
                            <div className="flex-1 my-auto ml-auto text-right text-sm pr-2">2020-01-01</div>
                        </div>
                    </div><div className="hover:bg-gray-100 w-full border-b border-gray-200 p-3">
                        <div className="flex flex-row">
                            <div className="flex-5 border-r border-gray-200">
                                <div className="font-bold">ㅁㅁㅁㅁ</div>
                                <div className="overflow-y-hidden h-[3rem] pr-1">12312312123 123123123123 12312312 3123123 12312312123 123123123123 12312312 3123123 12312312123 123123123123 12312312 3123123 12312312123 123123123123 12312312 3123123 12312312123 123123123123 12312312 3123123 12312312123 123123123123 12312312 3123123 12312312123 123123123123 12312312 3123123 </div>
                            </div>
                            <div className="flex-1 my-auto ml-auto text-right text-sm pr-2">2020-01-01</div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    )
}