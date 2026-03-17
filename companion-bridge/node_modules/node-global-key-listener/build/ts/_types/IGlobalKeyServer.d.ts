/**
 * Global key-server interface - all OSes will attempt to implement this server interface in order to
 */
export declare type IGlobalKeyServer = {
    /**
     * Start the keyserver.
     * @protected
     */
    start(): Promise<void>;
    /**
     * Stop the keyserver.
     * @protected
     */
    stop(): void;
};
//# sourceMappingURL=IGlobalKeyServer.d.ts.map