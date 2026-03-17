"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MacKeyServer = void 0;
const child_process_1 = require("child_process");
const MacGlobalKeyLookup_1 = require("./_data/MacGlobalKeyLookup");
const path_1 = __importDefault(require("path"));
const sudo_prompt_1 = __importDefault(require("sudo-prompt"));
const isSpawnEventSupported_1 = require("./isSpawnEventSupported");
const sPath = "../../bin/MacKeyServer";
/** Use this class to listen to key events on Mac OS */
class MacKeyServer {
    /**
     * Creates a new key server for mac
     * @param listener The callback to report key events to
     * @param config Additional optional configuration for the server
     */
    constructor(listener, config = {}) {
        this.running = false;
        this.restarting = false;
        this.listener = listener;
        this.config = config;
    }
    /**
     * Start the Key server and listen for keypresses
     * @param skipPerms Whether to skip attempting to add permissions
     */
    start(skipPerms) {
        this.running = true;
        const serverPath = this.config.serverPath || path_1.default.join(__dirname, sPath);
        this.proc = child_process_1.execFile(serverPath);
        if (this.config.onInfo)
            this.proc.stderr.on("data", data => { var _a, _b; return (_b = (_a = this.config).onInfo) === null || _b === void 0 ? void 0 : _b.call(_a, data.toString()); });
        const onError = this.config.onError;
        if (onError)
            this.proc.on("close", code => {
                if (!this.restarting && this.running)
                    onError(code);
            });
        this.proc.stdout.on("data", data => {
            const events = this._getEventData(data);
            for (let { event, eventId } of events) {
                const stopPropagation = !!this.listener(event);
                this.proc.stdin.write(`${stopPropagation ? "1" : "0"},${eventId}\n`);
            }
        });
        return this.handleStartup(skipPerms !== null && skipPerms !== void 0 ? skipPerms : false);
    }
    /**
     * Deals with the startup process of the server, possibly adding perms if required and restarting
     * @param skipPerms Whether to skip attempting to add permissions
     */
    handleStartup(skipPerms) {
        return new Promise((res, rej) => {
            let errored = false;
            const serverPath = this.config.serverPath || path_1.default.join(__dirname, sPath);
            // If setup fails, try adding permissions
            this.proc.on("error", async (err) => {
                errored = true;
                if (skipPerms) {
                    rej(err);
                }
                else {
                    try {
                        this.restarting = true;
                        this.proc.kill();
                        await this.addPerms(serverPath);
                        // If the server was stopped in between, just act as if it was started successfully
                        if (!this.running) {
                            res();
                            return;
                        }
                        res(this.start(true));
                    }
                    catch (e) {
                        rej(e);
                    }
                    finally {
                        this.restarting = false;
                    }
                }
            });
            if (isSpawnEventSupported_1.isSpawnEventSupported())
                this.proc.on("spawn", res);
            // A timed fallback if the spawn event is not supported
            else
                setTimeout(() => {
                    if (!errored)
                        res();
                }, 200);
        });
    }
    /**
     * Makes sure that the given path is executable
     * @param path The path to add the perms to
     */
    addPerms(path) {
        const options = {
            name: "Global key listener",
        };
        return new Promise((res, err) => {
            sudo_prompt_1.default.exec(`chmod +x "${path}"`, options, (error, stdout, stderr) => {
                if (error) {
                    err(error);
                    return;
                }
                if (stderr) {
                    err(stderr);
                    return;
                }
                res();
            });
        });
    }
    /** Stop the Key server */
    stop() {
        this.running = false;
        this.proc.stdout.pause();
        this.proc.kill();
    }
    /**
     * Obtains a IGlobalKeyEvent from stdout buffer data
     * @param data Data from stdout
     * @returns The standardized key event data
     */
    _getEventData(data) {
        const sData = data.toString();
        const lines = sData.trim().split(/\n/);
        return lines.map(line => {
            const lineData = line.replace(/\s+/, "");
            const [mouseKeyboard, downUp, sKeyCode, sLocationX, sLocationY, eventId,] = lineData.split(",");
            const isMouse = mouseKeyboard === 'MOUSE';
            const isDown = downUp === 'DOWN';
            const keyCode = Number.parseInt(sKeyCode, 10);
            const locationX = Number.parseFloat(sLocationX);
            const locationY = Number.parseFloat(sLocationY);
            const key = MacGlobalKeyLookup_1.MacGlobalKeyLookup[isMouse ? (0xFFFF0000 + keyCode) : keyCode];
            return {
                event: {
                    vKey: keyCode,
                    rawKey: key,
                    name: key === null || key === void 0 ? void 0 : key.standardName,
                    state: isDown ? "DOWN" : "UP",
                    scanCode: keyCode,
                    location: [locationX, locationY],
                    _raw: sData,
                },
                eventId,
            };
        });
    }
}
exports.MacKeyServer = MacKeyServer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFjS2V5U2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3RzL01hY0tleVNlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFDQSxpREFBcUQ7QUFHckQsbUVBQThEO0FBQzlELGdEQUF3QjtBQUV4Qiw4REFBK0I7QUFDL0IsbUVBQThEO0FBQzlELE1BQU0sS0FBSyxHQUFHLHdCQUF3QixDQUFDO0FBRXZDLHVEQUF1RDtBQUN2RCxNQUFhLFlBQVk7SUFRckI7Ozs7T0FJRztJQUNILFlBQVksUUFBK0IsRUFBRSxTQUFxQixFQUFFO1FBUjVELFlBQU8sR0FBRyxLQUFLLENBQUM7UUFDaEIsZUFBVSxHQUFHLEtBQUssQ0FBQztRQVF2QixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN6QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksS0FBSyxDQUFDLFNBQW1CO1FBQzVCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1FBRXBCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxJQUFJLGNBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXpFLElBQUksQ0FBQyxJQUFJLEdBQUcsd0JBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNqQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTTtZQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU8sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLGVBQUMsT0FBQSxNQUFBLE1BQUEsSUFBSSxDQUFDLE1BQU0sRUFBQyxNQUFNLG1EQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBLEVBQUEsQ0FBQyxDQUFDO1FBQ2hGLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO1FBQ3BDLElBQUksT0FBTztZQUNQLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsRUFBRTtnQkFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLE9BQU87b0JBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3hELENBQUMsQ0FBQyxDQUFDO1FBRVAsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRTtZQUNoQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3hDLEtBQUssSUFBSSxFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUMsSUFBSSxNQUFNLEVBQUU7Z0JBQ2pDLE1BQU0sZUFBZSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUUvQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLE9BQU8sSUFBSSxDQUFDLENBQUM7YUFDekU7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLGFBQVQsU0FBUyxjQUFULFNBQVMsR0FBSSxLQUFLLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQ7OztPQUdHO0lBQ08sYUFBYSxDQUFDLFNBQWtCO1FBQ3RDLE9BQU8sSUFBSSxPQUFPLENBQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDbEMsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO1lBQ3BCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxJQUFJLGNBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBRXpFLHlDQUF5QztZQUN6QyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFDLEdBQUcsRUFBQyxFQUFFO2dCQUM5QixPQUFPLEdBQUcsSUFBSSxDQUFDO2dCQUNmLElBQUksU0FBUyxFQUFFO29CQUNYLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDWjtxQkFBTTtvQkFDSCxJQUFJO3dCQUNBLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO3dCQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO3dCQUNqQixNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7d0JBRWhDLG1GQUFtRjt3QkFDbkYsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7NEJBQ2YsR0FBRyxFQUFFLENBQUM7NEJBQ04sT0FBTzt5QkFDVjt3QkFFRCxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO3FCQUN6QjtvQkFBQyxPQUFPLENBQUMsRUFBRTt3QkFDUixHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQ1Y7NEJBQVM7d0JBQ04sSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7cUJBQzNCO2lCQUNKO1lBQ0wsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLDZDQUFxQixFQUFFO2dCQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN4RCx1REFBdUQ7O2dCQUVuRCxVQUFVLENBQUMsR0FBRyxFQUFFO29CQUNaLElBQUksQ0FBQyxPQUFPO3dCQUFFLEdBQUcsRUFBRSxDQUFDO2dCQUN4QixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDaEIsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRUQ7OztPQUdHO0lBQ08sUUFBUSxDQUFDLElBQVk7UUFDM0IsTUFBTSxPQUFPLEdBQUc7WUFDWixJQUFJLEVBQUUscUJBQXFCO1NBQzlCLENBQUM7UUFDRixPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQzVCLHFCQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsSUFBSSxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDL0QsSUFBSSxLQUFLLEVBQUU7b0JBQ1AsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUNYLE9BQU87aUJBQ1Y7Z0JBQ0QsSUFBSSxNQUFNLEVBQUU7b0JBQ1IsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUNaLE9BQU87aUJBQ1Y7Z0JBQ0QsR0FBRyxFQUFFLENBQUM7WUFDVixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVELDBCQUEwQjtJQUNuQixJQUFJO1FBQ1AsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7UUFDckIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNyQixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNPLGFBQWEsQ0FBQyxJQUFZO1FBQ2hDLE1BQU0sS0FBSyxHQUFXLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN0QyxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNwQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztZQUV6QyxNQUFNLENBQ0YsYUFBYSxFQUNiLE1BQU0sRUFDTixRQUFRLEVBQ1IsVUFBVSxFQUNWLFVBQVUsRUFDVixPQUFPLEVBQ1YsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRXhCLE1BQU0sT0FBTyxHQUFHLGFBQWEsS0FBSyxPQUFPLENBQUM7WUFDMUMsTUFBTSxNQUFNLEdBQUcsTUFBTSxLQUFLLE1BQU0sQ0FBQztZQUVqQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUU5QyxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2hELE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFaEQsTUFBTSxHQUFHLEdBQUcsdUNBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFM0UsT0FBTztnQkFDSCxLQUFLLEVBQUU7b0JBQ0gsSUFBSSxFQUFFLE9BQU87b0JBQ2IsTUFBTSxFQUFFLEdBQUc7b0JBQ1gsSUFBSSxFQUFFLEdBQUcsYUFBSCxHQUFHLHVCQUFILEdBQUcsQ0FBRSxZQUFZO29CQUN2QixLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUk7b0JBQzdCLFFBQVEsRUFBRSxPQUFPO29CQUNqQixRQUFRLEVBQUUsQ0FBRSxTQUFTLEVBQUUsU0FBUyxDQUFFO29CQUNsQyxJQUFJLEVBQUUsS0FBSztpQkFDZDtnQkFDRCxPQUFPO2FBQ1YsQ0FBQztRQUNOLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztDQUNKO0FBdEtELG9DQXNLQyJ9