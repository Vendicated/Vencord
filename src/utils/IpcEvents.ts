type Enum<T extends Record<string, string>> = {
    [k in keyof T]: T[k];
} & { [v in keyof T as T[v]]: v; };

function strEnum<T extends Record<string, string>>(obj: T): T {
    const o = {} as T;
    for (const key in obj) {
        o[key] = obj[key] as any;
        o[obj[key]] = key as any;
    }
    return Object.freeze(o);
}

export default strEnum({
    QUICK_CSS_UPDATE: "BencordQuickCssUpdate",
    GET_QUICK_CSS: "BencordGetQuickCss",
    GET_SETTINGS_DIR: "BencordGetSettingsDir",
    GET_SETTINGS: "BencordGetSettings",
    SET_SETTINGS: "BencordSetSettings",
    OPEN_EXTERNAL: "BencordOpenExternal",
    OPEN_QUICKCSS: "BencordOpenQuickCss",
    GET_UPDATES: "BencordGetUpdates",
    GET_REPO: "BencordGetRepo",
    GET_HASHES: "BencordGetHashes",
    UPDATE: "BencordUpdate",
    BUILD: "BencordBuild",
    GET_DESKTOP_CAPTURE_SOURCES: "BencordGetDesktopCaptureSources"
} as const);
