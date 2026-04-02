import {LuBookText, LuLayoutTemplate} from "react-icons/lu";
import {GrSettingsOption, GrTrash, GrUserSettings} from "react-icons/gr";
import {MdOutlineSettings} from "react-icons/md";

export const menuItems = [
    {name: "개인 노트", icon: LuBookText, path: "/"},
    // {name: "템플릿", icon: LuLayoutTemplate, path: "/template"},
    {name: "휴지통", icon: GrTrash, path: "/deleted"},
    // {name: "북마크", icon: GrBookmark, path: "/bookmarks"},
    {name: "설정", icon: MdOutlineSettings, path: "/settings"},

];