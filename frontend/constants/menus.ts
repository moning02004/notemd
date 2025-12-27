import {LuBookText, LuLayoutTemplate} from "react-icons/lu";
import {GrTrash} from "react-icons/gr";

export const menuItems = [
    {name: "전체 노트", icon: LuBookText, path: "/"},
    // {name: "템플릿", icon: LuLayoutTemplate, path: "/template"},
    {name: "휴지통", icon: GrTrash, path: "/deleted"},
    // {name: "북마크", icon: GrBookmark, path: "/bookmarks"},
];