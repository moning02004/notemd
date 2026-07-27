import {IoIosCheckmarkCircleOutline} from "react-icons/io";
import {IoWarningOutline} from "react-icons/io5";

export function LoadingSpinner() {
    return (
        <div className="ml-auto w-5 h-5 border-2 border-border-strong border-t-gray-500 rounded-full animate-spin"></div>
    );
}

export function Warning() {
    return (
        <IoWarningOutline size={22} className="text-danger"/>
    );
}

export function Complete() {
    return (
        <IoIosCheckmarkCircleOutline size={22} className="text-accent"/>
    );
}
