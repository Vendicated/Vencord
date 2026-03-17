"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalKeyboardListener = void 0;
const os_1 = __importDefault(require("os"));
const MacKeyServer_1 = require("./ts/MacKeyServer");
const WinKeyServer_1 = require("./ts/WinKeyServer");
const X11KeyServer_1 = require("./ts/X11KeyServer");
__exportStar(require("./ts/_types/IGlobalKeyListener"), exports);
__exportStar(require("./ts/_types/IGlobalKeyEvent"), exports);
__exportStar(require("./ts/_types/IGlobalKey"), exports);
__exportStar(require("./ts/_types/IGlobalKeyDownMap"), exports);
__exportStar(require("./ts/_types/IWindowsConfig"), exports);
__exportStar(require("./ts/_types/IConfig"), exports);
/**
 * A cross-platform global keyboard listener. Ideal for setting up global keyboard shortcuts
 * and key-loggers (usually for automation).
 * This keyserver uses low-level hooks on Windows OS and Event Taps on Mac OS, which allows
 * event propagation to be halted to the rest of the operating system as well as allowing
 * any key to be used for shortcuts.
 */
class GlobalKeyboardListener {
    /**
     * Creates a new keyboard listener
     * @param config The optional configuration for the key listener
     */
    constructor(config = {}) {
        /** Whether the server is currently running */
        this.isRunning = false;
        this.stopTimeoutID = 0;
        /** The following listener is used to monitor which keys are being held down */
        this.baseListener = event => {
            if (event.name) {
                switch (event.state) {
                    case "DOWN":
                        this.isDown[event.name] = true;
                        break;
                    case "UP":
                        this.isDown[event.name] = false;
                        break;
                }
            }
            let stopPropagation = false;
            for (let onKey of this.listeners) {
                //Forward event
                try {
                    const res = onKey(event, this.isDown);
                    //Handle catch data
                    if (res instanceof Object) {
                        if (res.stopPropagation)
                            stopPropagation = true;
                        if (res.stopImmediatePropagation)
                            break;
                    }
                    else if (res) {
                        stopPropagation = true;
                    }
                }
                catch (e) {
                    console.error(e);
                }
            }
            return stopPropagation;
        };
        this.listeners = [];
        this.isDown = {};
        this.config = config;
        switch (os_1.default.platform()) {
            case "win32":
                this.keyServer = new WinKeyServer_1.WinKeyServer(this.baseListener, config.windows);
                break;
            case "darwin":
                this.keyServer = new MacKeyServer_1.MacKeyServer(this.baseListener, config.mac);
                break;
            case "linux":
                this.keyServer = new X11KeyServer_1.X11KeyServer(this.baseListener, config.x11);
                break;
            default:
                throw Error("This OS is not supported");
        }
    }
    /**
     * Add a global keyboard listener to the global keyboard listener server.
     * @param listener The listener to add to the global keyboard listener
     * @throws An exception if the process could not be started
     */
    async addListener(listener) {
        this.listeners.push(listener);
        if (this.listeners.length == 1) {
            clearTimeout(this.stopTimeoutID);
            await this.start();
        }
    }
    /**
     * Remove a global keyboard listener from the global keyboard listener server.
     * @param listener The listener to remove from the global keyboard listener
     */
    removeListener(listener) {
        var _a;
        const index = this.listeners.indexOf(listener);
        if (index != -1) {
            this.listeners.splice(index, 1);
            if (this.listeners.length == 0) {
                if (this.config.disposeDelay == -1)
                    this.stop();
                else
                    this.stopTimeoutID = setTimeout(() => this.stop(), (_a = this.config.disposeDelay) !== null && _a !== void 0 ? _a : 100);
            }
        }
    }
    /** Removes all listeners and destroys the key server */
    kill() {
        this.listeners = [];
        this.stop();
    }
    /** Start the key server */
    start() {
        let promise = Promise.resolve();
        if (!this.isRunning)
            promise = this.keyServer.start();
        this.isRunning = true;
        return promise;
    }
    /** Stop the key server */
    stop() {
        if (this.isRunning)
            this.keyServer.stop();
        this.isRunning = false;
    }
}
exports.GlobalKeyboardListener = GlobalKeyboardListener;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRDQUFvQjtBQUNwQixvREFBK0M7QUFDL0Msb0RBQStDO0FBQy9DLG9EQUErQztBQU8vQyxpRUFBK0M7QUFDL0MsOERBQTRDO0FBQzVDLHlEQUF1QztBQUN2QyxnRUFBOEM7QUFDOUMsNkRBQTJDO0FBQzNDLHNEQUFvQztBQUVwQzs7Ozs7O0dBTUc7QUFDSCxNQUFhLHNCQUFzQjtJQWEvQjs7O09BR0c7SUFDSCxZQUFtQixTQUFrQixFQUFFO1FBWHZDLDhDQUE4QztRQUNwQyxjQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ2xCLGtCQUFhLEdBQUcsQ0FBQyxDQUFDO1FBZ0Y1QiwrRUFBK0U7UUFDdkUsaUJBQVksR0FBMEIsS0FBSyxDQUFDLEVBQUU7WUFDbEQsSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFO2dCQUNaLFFBQVEsS0FBSyxDQUFDLEtBQUssRUFBRTtvQkFDakIsS0FBSyxNQUFNO3dCQUNQLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQzt3QkFDL0IsTUFBTTtvQkFDVixLQUFLLElBQUk7d0JBQ0wsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDO3dCQUNoQyxNQUFNO2lCQUNiO2FBQ0o7WUFFRCxJQUFJLGVBQWUsR0FBRyxLQUFLLENBQUM7WUFDNUIsS0FBSyxJQUFJLEtBQUssSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO2dCQUM5QixlQUFlO2dCQUNmLElBQUk7b0JBQ0EsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBRXRDLG1CQUFtQjtvQkFDbkIsSUFBSSxHQUFHLFlBQVksTUFBTSxFQUFFO3dCQUN2QixJQUFJ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