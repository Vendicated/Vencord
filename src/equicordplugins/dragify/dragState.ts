/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { DropEntity } from "./utils";

type DragSessionState = {
    activeEntity: DropEntity | null;
    activeUserId: string | null;
    activeGuildId: string | null;
    dragSourceIsInput: boolean;
    active: boolean;
    lastDropAt: number;
    lastHandledDrop: { at: number; key: string; };
    lastDragEventAt: number;
    watchdogTimer: number | null;
    guildCleanupTimer: number | null;
};

const dropDedupeWindowMs = 150;

const state: DragSessionState = {
    activeEntity: null,
    activeUserId: null,
    activeGuildId: null,
    dragSourceIsInput: false,
    active: false,
    lastDropAt: 0,
    lastHandledDrop: { at: 0, key: "" },
    lastDragEventAt: 0,
    watchdogTimer: null,
    guildCleanupTimer: null,
};

export function beginDrag(entity: DropEntity) {
    cancelGuildCleanup();
    state.activeEntity = entity;
    state.activeUserId = entity.kind === "user" ? entity.id : null;
    state.activeGuildId = entity.kind === "guild" ? entity.id : null;
    state.active = true;
    touchDrag();
}

export function clearDragState() {
    state.activeEntity = null;
    state.activeUserId = null;
    state.activeGuildId = null;
    state.dragSourceIsInput = false;
    state.active = false;
}

export function markInputDragSource() {
    clearDragState();
    state.dragSourceIsInput = true;
}

export function isInputDragSource() {
    return state.dragSourceIsInput;
}

export function touchDrag() {
    state.lastDragEventAt = Date.now();
}

export function getLastDropAt() {
    return state.lastDropAt;
}

export function markDrop() {
    state.lastDropAt = Date.now();
}

export function shouldIgnoreDrop(key: string) {
    const now = Date.now();
    if (state.lastHandledDrop.key === key && now - state.lastHandledDrop.at < dropDedupeWindowMs) return true;
    state.lastHandledDrop = { key, at: now };
    return false;
}

export function hasActiveDrag() {
    return state.active || state.activeEntity !== null || state.activeUserId !== null || state.activeGuildId !== null;
}

export function isGuildDragActive() {
    return state.activeGuildId !== null || state.activeEntity?.kind === "guild";
}

export function isUserDragActive() {
    return state.activeUserId !== null || state.activeEntity?.kind === "user";
}

export function getActiveEntity() {
    return state.activeEntity;
}

export function startDragWatchdog(onExpire: () => void) {
    if (state.watchdogTimer !== null) return;
    state.watchdogTimer = window.setInterval(() => {
        if (!state.active) return;
        if (Date.now() - state.lastDragEventAt < 1200) return;
        clearDragState();
        onExpire();
    }, 500);
}

export function stopDragWatchdog() {
    if (state.watchdogTimer !== null) {
        clearInterval(state.watchdogTimer);
        state.watchdogTimer = null;
    }
}

export function scheduleGuildCleanup(onExpire: () => void) {
    cancelGuildCleanup();
    state.guildCleanupTimer = window.setTimeout(() => {
        if (Date.now() - state.lastDragEventAt < 200) return;
        clearDragState();
        onExpire();
    }, 300);
}

export function cancelGuildCleanup() {
    if (state.guildCleanupTimer === null) return;
    clearTimeout(state.guildCleanupTimer);
    state.guildCleanupTimer = null;
}

export function stopDragState() {
    cancelGuildCleanup();
    stopDragWatchdog();
    clearDragState();
}
