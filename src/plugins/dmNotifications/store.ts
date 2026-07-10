/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Channel, Message } from "@vencord/discord-types";
import { useEffect, useReducer } from "@webpack/common";

export interface ToastItem {
    id: number;
    message: Message;
    channel: Channel;
}

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach(l => l());
}

export function pushToast(message: Message, channel: Channel, maxToasts: number) {
    const item: ToastItem = { id: nextId++, message, channel };
    toasts = [item, ...toasts].slice(0, Math.max(1, maxToasts));
    emit();
}

export function removeToast(id: number) {
    toasts = toasts.filter(t => t.id !== id);
    emit();
}

export function clearToasts() {
    toasts = [];
    emit();
}

export function getToasts() {
    return toasts;
}

export function useToasts() {
    const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
    useEffect(() => {
        listeners.add(forceUpdate);
        return () => void listeners.delete(forceUpdate);
    }, []);
    return toasts;
}
