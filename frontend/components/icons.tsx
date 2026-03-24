import {IoIosCheckmarkCircleOutline} from "react-icons/io";
import {IoWarningOutline} from "react-icons/io5";

export function LoadingSpinner() {
    return (
        <div className="ml-auto w-5 h-5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
    );
}

export function Warning() {
    return (
        <IoWarningOutline size={22} className="text-red-500"/>
    );
}

export function Complete() {
    return (
        <IoIosCheckmarkCircleOutline size={22} className="text-green-500"/>
    );
}
