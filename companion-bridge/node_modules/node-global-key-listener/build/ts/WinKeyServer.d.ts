import { IGlobalKeyServer } from "./_types/IGlobalKeyServer";
import { IGlobalKeyEvent } from "./_types/IGlobalKeyEvent";
import { IGlobalKeyListenerRaw } from "./_types/IGlobalKeyListenerRaw";
import { IWindowsConfig } from "./_types/IWindowsConfig";
/** Use this class to listen to key events on Windows OS */
export declare class WinKeyServer implements IGlobalKeyServer {
    protected listener: IGlobalKeyListenerRaw;
    private proc;
    protected config: IWindowsConfig;
    /**
     * Creates a new key server for windows
     * @param listener The callback to report key events to
     * @param windowsConfig The optional windows configuration
     */
    constructor(listener: IGlobalKeyListenerRaw, config?: IWindowsConfig);
    /** Start the Key server and listen for keypresses */
    start(): Promise<void>;
    /** Stop the Key server */
    stop(): void;
    /**
     * Obtains a IGlobalKeyEvent from stdout buffer data
     * @param data Data from stdout
     * @returns The standardized key event data
     */
    protected _getEventData(data: any): {
        event: IGlobalKeyEvent;
        eventId: string;
    }[];
}
//# sourceMappingURL=WinKeyServer.d.ts.map