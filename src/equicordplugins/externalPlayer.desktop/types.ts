/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ChildProcess } from "child_process";
import type { Socket } from "net";

export interface PlayerStatus {
    player: string;
    paused: boolean;
    time: number | null;
    duration: number | null;
}

export type Statuses = Record<string, PlayerStatus & { controllable: boolean; }>;

export interface VlcControl {
    port: number;
    password: string;
    ready?: boolean;
    pending?: boolean;
}

export interface Session {
    status: PlayerStatus;
    proc?: ChildProcess;
    socket?: Socket;
    vlc?: VlcControl;
    closed?: boolean;
}

export interface LaunchResult {
    success: boolean;
    error?: string;
}

export interface MediaItem {
    url: string;
    name: string;
    keys: string[];
}
