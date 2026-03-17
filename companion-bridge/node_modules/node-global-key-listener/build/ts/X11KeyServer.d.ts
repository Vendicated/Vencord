/// <reference types="node" />
import { IGlobalKeyServer } from "./_types/IGlobalKeyServer";
import { IGlobalKeyListenerRaw } from "./_types/IGlobalKeyListenerRaw";
import { IGlobalKeyEvent } from "./_types/IGlobalKeyEvent";
import { IX11Config } from "./_types/IX11Config";
/** Use this class to listen to key events on X11 */
export declare class X11KeyServer implements IGlobalKeyServer {
    protected listener: IGlobalKeyListenerRaw;
    private proc;
    private config;
    private running;
    private restarting;
    /**
     * Creates a new key server for x11
     * @param listener The callback to report key events to
     * @param config Additional optional configuration for the server
     */
    constructor(listener: IGlobalKeyListenerRaw, config?: IX11Config);
    /**
     * Start the Key server and listen for keypresses
     * @param skipPerms Whether to skip attempting to add permissions
     */
    start(skipPerms?: boolean): Promise<void>;
    /**
     * Deals with the startup process of the server, possibly adding perms if required and restarting
     * @param skipPerms Whether to skip attempting to add permissions
     */
    protected handleStartup(skipPerms: boolean): Promise<void>;
    /**
     * Makes sure that the given path is executable
     * @param path The path to add the perms to
     */
    protected addPerms(path: string): Promise<void>;
    /** Stop the Key server */
    stop(): void;
    /**
     * Obtains a IGlobalKeyEvent from stdout buffer data
     * @param data Data from stdout
     * @returns The standardized key event data
     */
    protected _getEventData(data: Buffer): {
        event: IGlobalKeyEvent;
        eventId: string;
    }[];
}
//# sourceMappingURL=X11KeyServer.d.ts.map