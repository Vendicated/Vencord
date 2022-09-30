import { waitFor } from "../webpack";

let NoticesModule: any;
waitFor(m => m.show && m.dismiss && !m.suppressAll, m => NoticesModule = m);

export const noticesQueue = [] as any[];
export let currentNotice: any = null;

export function popNotice() {
    NoticesModule.dismiss();
}

export function nextNotice() {
    currentNotice = noticesQueue.shift();

    if (currentNotice) {
        NoticesModule.show(...currentNotice, "VencordNotice");
    }
}

export function showNotice(message: string, buttonText: string, onOkClick: () => void) {
    noticesQueue.push(["GENERIC", message, buttonText, onOkClick]);
    if (!currentNotice) nextNotice();
}
