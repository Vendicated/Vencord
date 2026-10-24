/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { proxyLazy } from "@utils/lazy";
import { isObjectEmpty } from "@utils/misc";
import { PluginNative } from "@utils/types";
import { lodash, showToast, zustandCreate } from "@webpack/common";

import type { Statuses } from "./types";

export const Native = VencordNative.pluginHelpers.ExternalPlayer as PluginNative<typeof import("./native")>;

export const playerNames: Record<string, string> = { mpv: "mpv", vlc: "VLC" };

export const useStatusStore: {
    <T>(selector: (state: { statuses: Statuses; }) => T): T;
    getState(): { statuses: Statuses; };
    setState(state: { statuses: Statuses; }): void;
} = proxyLazy(() => zustandCreate(() => ({ statuses: {} })));

let pollId: ReturnType<typeof setInterval> | undefined;

export function stopPolling() {
    clearInterval(pollId);
    pollId = undefined;
    useStatusStore.setState({ statuses: {} });
}

export function startPolling() {
    pollId ??= setInterval(() => Native.getStatuses().then(statuses => {
        if (isObjectEmpty(statuses)) stopPolling();
        else if (!lodash.isEqual(statuses, useStatusStore.getState().statuses)) useStatusStore.setState({ statuses });
    }, stopPolling), 500);
}

export async function play(url: string) {
    if (!Native) return showToast({ text: "Fully restart Discord to load ExternalPlayer.", variant: "critical" });
    const res = await Native.launch(url).catch(() => ({ success: false, error: undefined }));
    if (res.success) startPolling();
    else showToast({ text: res.error ?? "Failed to open the player.", variant: "critical" });
}
