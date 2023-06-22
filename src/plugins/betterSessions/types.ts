export interface SessionInfo {
    session: {
        id_hash: string;
        approx_last_used_time: Date;
        client_info: {
            os: string;
            platform: string;
            location: string;
        };
    },
    current?: boolean;
}
