import IPC_EVENTS from './utils/IpcEvents';
import { IpcRenderer, ipcRenderer } from 'electron';

export default {
    getVersions: () => process.versions,
    ipc: {
        send(event: string, ...args: any[]) {
            if (event in IPC_EVENTS) ipcRenderer.send(event, ...args);
            else throw new Error(`Event ${event} not allowed.`);
        },
        sendSync<T = any>(event: string, ...args: any[]): T {
            if (event in IPC_EVENTS) return ipcRenderer.sendSync(event, ...args);
            else throw new Error(`Event ${event} not allowed.`);
        },
        on(event: string, listener: Parameters<IpcRenderer["on"]>[1]) {
            if (event in IPC_EVENTS) ipcRenderer.on(event, listener);
            else throw new Error(`Event ${event} not allowed.`);
        },
        invoke<T = any>(event: string, ...args: any[]): Promise<T> {
            if (event in IPC_EVENTS) return ipcRenderer.invoke(event, ...args);
            else throw new Error(`Event ${event} not allowed.`);
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