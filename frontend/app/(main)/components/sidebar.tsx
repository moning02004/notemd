"use client"

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {FiHome, FiLogOut, FiPenTool, FiPlus, FiUser, FiUsers} from 'react-icons/fi';

const iconSize = 14
const sideMenu = [
    {title: "대시보드", icon: <FiHome size={iconSize}/>, url: "/dashboard"},
    {
        title: "노트",
        icon: <FiPenTool size={iconSize}/>,
        url: "/notes",
        rightIcon: <FiPlus size={iconSize}/>,
        rightUrl: '/notes/add'
    },
    {title: "멤버", icon: <FiUsers size={iconSize}/>, url: "/members"},
]

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        router.replace("/login/")
    }

    return (
        <div className="w-64 bg-gray-100 text-gray-900 flex flex-col shadow-sm">
            <div className=" font-bold p-5 border-gray-200">My Note</div>
            <nav className="flex flex-col flex-1 mt-4 gap-3">
                {
                    sideMenu.map((el, index) => {
                        return (
                            <div className={`flex w-full px-3 hover:bg-gray-200 
                ${el.url && pathname.startsWith(el.url) ? 'bg-[#cfcfcf]' : ''}`}
                                 key={index}
                            >
                                <Link
                                    href={el.url ? el.url : ''}
                                    className="flex my-auto flex-5 p-2"
                                >
                                    <div className='flex flex-row flex-1 gap-2'>
                                        <div className='my-auto'>{el.icon}</div>
                                        <div className='my-auto'>{el.title}</div>
                                    </div>
                                </Link>
                                {
                                    el.rightIcon && (
                                        <Link className='flex justify-center m-auto hover:rounded hover:bg-[#adadad] p-1'
                                              href={el.rightUrl}>
                                            {el.rightIcon}
                                        </Link>)
                                }
                            </div>
                        )
                    })
                }
            </nav>

            <div className="flex mt-auto py-7 px-5">
                <button className='cursor-pointer'><FiUser size={22}/></button>
                <button className='ml-auto cursor-pointer' onClick={handleLogout}><FiLogOut size={22}/></button>
            </div>
        </div>
    );
}
