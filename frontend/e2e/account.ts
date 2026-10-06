import {execFileSync} from "node:child_process"
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from "node:fs"
import path from "node:path"

/** 테스트 계정을 만들고 지우는 스크립트가 도는 백엔드 컨테이너. */
const BACKEND_CONTAINER = process.env.E2E_BACKEND_CONTAINER ?? "notemd-backend"
const FILE = path.join(__dirname, ".auth", "account.json")

export type Account = { username: string, password: string, user_hash: string }

const script = (...args: string[]) =>
    execFileSync("docker", ["exec", BACKEND_CONTAINER, "python3", "-m", "scripts.e2e_user", ...args],
        {encoding: "utf8", stdio: ["ignore", "pipe", "ignore"]}).trim().split("\n").pop()!

export function createAccount(): Account {
    const account = JSON.parse(script("create")) as Account
    mkdirSync(path.dirname(FILE), {recursive: true})
    writeFileSync(FILE, JSON.stringify(account))
    return account
}

export function readAccount(): Account {
    return JSON.parse(readFileSync(FILE, "utf8")) as Account
}

export function deleteAccount(): void {
    if (!existsSync(FILE)) return
    script("delete", readAccount().username)
    rmSync(FILE)
}
