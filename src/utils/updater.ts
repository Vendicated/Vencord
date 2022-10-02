import IpcEvents from "./IpcEvents";
import Logger from "./logger";
import { IpcRes } from './types';

export const UpdateLogger = new Logger("Updater", "white");
export let isOutdated = false;
export let updateError: any;
export let changes: Record<"hash" | "author" | "message", string>[];

async function Unwrap<T>(p: Promise<IpcRes<T>>) {
    const res = await p;

    if (res.ok) return res.value;

    updateError = res.error;
    throw res.error;
}

export async function checkForUpdates() {
    changes = await Unwrap(VencordNative.ipc.invoke<IpcRes<typeof changes>>(IpcEvents.GET_UPDATES));
    return (isOutdated = changes.length > 0);
}

export async function update() {
    if (!isOutdated) return true;

    const res = await Unwrap(VencordNative.ipc.invoke<IpcRes<boolean>>(IpcEvents.UPDATE));

    if (res)
        isOutdated = false;

    return res;
}

export function getRepo() {
    return Unwrap(VencordNative.ipc.invoke<IpcRes<string>>(IpcEvents.GET_REPO));
}

type Hashes = Record<"patcher.js" | "preload.js" | "renderer.js", string>;

/**
 * @returns true if hard restart is required
 */
export async function rebuild() {
    const oldHashes = await Unwrap(VencordNative.ipc.invoke<IpcRes<Hashes>>(IpcEvents.GET_HASHES));

    if (!await Unwrap(VencordNative.ipc.invoke<IpcRes<boolean>>(IpcEvents.BUILD)))
        throw new Error("The Build failed. Please try manually building the new update");

    const newHashes = await Unwrap(VencordNative.ipc.invoke<IpcRes<Hashes>>(IpcEvents.GET_HASHES));

    return oldHashes["patcher.js"] !== newHashes["patcher.js"] ||
        oldHashes["preload.js"] !== newHashes["preload.js"];
}
