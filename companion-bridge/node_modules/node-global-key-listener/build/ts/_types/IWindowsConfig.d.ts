/** Key server configuration that's windows specific */
export declare type IWindowsConfig = {
    /** A callback that's triggered with additional information from the keyhandler */
    onInfo?: {
        (data: string): void;
    };
    /** A callback that's triggered with additional information from the keyhandler */
    onError?: {
        (errorCode: number): void;
    };
    /** Path to server executable */
    serverPath?: string;
};
//# sourceMappingURL=IWindowsConfig.d.ts.map