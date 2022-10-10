declare global {
    export var IS_WEB: boolean;
    export var BencordNative: typeof import("./BencordNative").default;
    export var Bencord: typeof import("./Bencord");
    export var appSettings: {
        set(setting: string, v: any): void;
    };
    export var DiscordNative: any;

    interface Window {
        webpackChunkdiscord_app: {
            push(chunk: any): any;
            pop(): any;
        };
        [k: string]: any;
    }
}

export { };
