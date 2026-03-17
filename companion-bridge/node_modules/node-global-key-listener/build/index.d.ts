import { IConfig } from "./ts/_types/IConfig";
import { IGlobalKeyListener } from "./ts/_types/IGlobalKeyListener";
import { IGlobalKeyServer } from "./ts/_types/IGlobalKeyServer";
export * from "./ts/_types/IGlobalKeyListener";
export * from "./ts/_types/IGlobalKeyEvent";
export * from "./ts/_types/IGlobalKey";
export * from "./ts/_types/IGlobalKeyDownMap";
export * from "./ts/_types/IWindowsConfig";
export * from "./ts/_types/IConfig";
/**
 * A cross-platform global keyboard listener. Ideal for setting up global keyboard shortcuts
 * and key-loggers (usually for automation).
 * This keyserver uses low-level hooks on Windows OS and Event Taps on Mac OS, which allows
 * event propagation to be halted to the rest of the operating system as well as allowing
 * any key to be used for shortcuts.
 */
export declare class GlobalKeyboardListener {
    /** The underlying keyServer used to listen and halt propagation of events */
    protected keyServer: IGlobalKeyServer;
    protected listeners: Array<IGlobalKeyListener>;
    protected config: IConfig;
    /** Whether the server is currently running */
    protected isRunning: boolean;
    protected stopTimeoutID: number;
    /** The underlying map of keys that are being held down */
    private readonly isDown;
    /**
     * Creates a new keyboard listener
     * @param config The optional configuration for the key listener
     */
    constructor(config?: IConfig);
    /**
     * Add a global keyboard listener to the global keyboard listener server.
     * @param listener The listener to add to the global keyboard listener
     * @throws An exception if the process could not be started
     */
    addListener(listener: IGlobalKeyListener): Promise<void>;
    /**
     * Remove a global keyboard listener from the global keyboard listener server.
     * @param listener The listener to remove from the global keyboard listener
     */
    removeListener(listener: IGlobalKeyListener): void;
    /** Removes all listeners and destroys the key server */
    kill(): void;
    /** Start the key server */
    protected start(): Promise<void>;
    /** Stop the key server */
    protected stop(): void;
    /** The following listener is used to monitor which keys are being held down */
    private baseListener;
}
//# sourceMappingURL=index.d.ts.map