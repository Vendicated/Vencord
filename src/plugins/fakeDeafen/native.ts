import { ipcRenderer } from "electron";

export function nativeFunction() {
    return ipcRenderer.invoke("native-function");
}