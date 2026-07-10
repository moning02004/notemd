export interface AuthTokenResponse {
    access_token: string;
    user_hash: string;
    is_superuser?: boolean;
}

export interface CheckAccountExistenceResponse {
    exists: boolean;
}
