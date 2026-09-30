export interface AuthTokenResponse {
    access_token: string;
    user_hash: string;
    is_superuser?: boolean;
    /** 임시 비밀번호로 들어왔다. 새 비밀번호를 정하기 전까지 다른 화면을 보여주지 않는다. */
    must_change_password?: boolean;
}

export interface CheckAccountExistenceResponse {
    exists: boolean;
}
