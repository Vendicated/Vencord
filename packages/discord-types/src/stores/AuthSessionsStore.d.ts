import { FluxStore } from "..";

export interface AuthSessionClientInfo {
    os?: string;
    platform?: string;
    location?: string;
    ip?: string;
}

export interface AuthSession {
    id_hash: string;
    approx_last_used_time: Date;
    client_info?: AuthSessionClientInfo;
}

export class AuthSessionsStore extends FluxStore {
    getSessions(): AuthSession[];
}
