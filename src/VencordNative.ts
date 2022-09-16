import IPC_EVENTS from './utils/IpcEvents';
import { IpcRenderer, ipcRenderer } from 'electron';

function assertEventAllowed(event: string) {
    if (!(event in IPC_EVENTS)) throw new Error(`Event ${event} not allowed.`);
}
export default {
    getVersions: () => process.versions,
    ipc: {
        send(event: string, ...args: any[]) {
            assertEventAllowed(event);
            ipcRenderer.send(event, ...args);
        },
        sendSync<T = any>(event: string, ...args: any[]): T {
            assertEventAllowed(event);
            return ipcRenderer.sendSync(event, ...args);
        },
        on(event: string, listener: Parameters<IpcRenderer["on"]>[1]) {
            assertEventAllowed(event);
            ipcRenderer.on(event, listener);
        },
        off(event: string, listener: Parameters<IpcRenderer["off"]>[1]) {
            assertEventAllowed(event);
            ipcRenderer.off(event, listener);
        },
        invoke<T = any>(event: string, ...args: any[]): Promise<T> {
            assertEventAllowed(event);
            return ipcRenderer.invoke(event, ...args);
        }
    },
    require(mod: string) {
        const settings = ipcRenderer.sendSync(IPC_EVENTS.GET_SETTINGS);
        try {
            if (!JSON.parse(settings).unsafeRequire) throw "no";
        } catch {
            throw new Error("Unsafe require is not allowed. Enable it in settings and try again.");
        }
        return require(mod);
    }
};
