import {deleteAccount} from "./account"

export default function globalTeardown() {
    deleteAccount()
}
