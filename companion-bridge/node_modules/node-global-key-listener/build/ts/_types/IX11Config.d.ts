/** Key server configuration that's X11 specific */
export declare type IX11Config = {
    /** A callback that's triggered with additional information from the keyhandler */
    onInfo?: {
        (data: string): void;
    };
    /** A callback that's triggered with additional information from the keyhandler */
    onError?: {
        (errorCode: number | null): void;
    };
    /** Path to server executable */
    serverPath?: string;
};
//# sourceMappingURL=IX11Config.d.ts.map