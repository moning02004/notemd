import {LuBookText, LuUser} from "react-icons/lu";
import {MdWorkspacesFilled} from "react-icons/md";

export const menuItems = [
    {name: "개인 노트", icon: LuBookText, path: "/"},
    {name: "워크스페이스", icon: MdWorkspacesFilled, path: "/workspace"},
    {name: "내정보", icon: LuUser, path: "/my-info"},
];