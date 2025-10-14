// Minimal runtime shims to centralize small ambiguous runtime shapes
declare global {
    // Ipc call result wrapper used by native bindings. Some callers expect an 'error' field when ok===false.
    type IpcRes<T> = { ok: true; value: T } | { ok: false; error: any };

    // Permission overwrite entry used in channel.permissionOverwrites maps
    type PermissionOverwrite = { type: number; id: string; allow?: number | bigint; deny?: number | bigint };

    // Sessions/status mapping used by Presence/PlatformIndicators
    type Session = {
        sessionId: string;
        status: string;
        active: boolean;
        clientInfo: { version: number; os: string; client: string };
    };

    // Sessions store map
    type SessionsMap = Record<string, Session>;
}

export {};
