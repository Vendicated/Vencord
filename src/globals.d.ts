declare global {
    export var VencordNative: typeof import("./VencordNative").default;
    export var appSettings: {
        set(setting: string, v: any): void;
    };

    interface Window {
        webpackChunkdiscord_app: {
            push(chunk: any): any;
        };
    }
}

export { };