declare var appSettings: any;

declare global {
    interface Window {
        webpackChunkdiscord_app: { push(chunk): any; };
    }
}

export { };