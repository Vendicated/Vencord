import TVencordNative from "./VencordNative";

declare global {
    export var VencordNative: typeof TVencordNative;
    export var appSettings: {
        set(setting: string, v: any): void;
    };

    interface Window {
        webpackChunkdiscord_app: {
            push(chunk: any): any;
        };
    }
}
