import { IPC_QUICK_CSS_UPDATE, IPC_GET_QUICK_CSS } from './utils/ipcEvents';
import { ipcRenderer } from 'electron';

export default {
    handleQuickCssUpdate(cb: (s: string) => void) {
        ipcRenderer.on(IPC_QUICK_CSS_UPDATE, (_, css) => {
            cb(css);
        });
    },
    getQuickCss: () => ipcRenderer.invoke(IPC_GET_QUICK_CSS) as Promise<string>,
    getVersions: () => process.versions
};