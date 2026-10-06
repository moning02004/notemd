import {createAccount, deleteAccount} from "./account"

export default function globalSetup() {
    // 지난번에 중간에 끊겨 남은 계정이 있으면 먼저 지운다.
    deleteAccount()
    createAccount()
}
