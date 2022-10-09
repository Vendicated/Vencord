declare global {
    export var IS_WEB: boolean;
    export var VencordNative: typeof import("./VencordNative").default;
    export var Vencord: typeof import("./Vencord");
    export var appSettings: {
        set(setting: string, v: any): void;
    };
    export var DiscordNative: any;

    interface Window {
        webpackChunkdiscord_app: {
            push(chunk: any): any;
            pop(): any;
        };
        [k: PropertyKey]: any;
    }
}

export { };
