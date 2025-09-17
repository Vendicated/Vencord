/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { spawn } from "child_process";
import { randomUUID } from "crypto";

import { createStreamSplitter } from "./streamSplit";

const FIELDS = ["status", "playerName", "artist", "title", "album", "mpris:artUrl", "volume", "position", "mpris:length", "shuffle", "loop",] as const;

export type PlayerData = Record<typeof FIELDS[number], string>;

export async function watchPlayerCtl() {
    const sep = randomUUID();
    const format = FIELDS.map(f => `{{${f}}}`).join(sep);

    // FIXME: this process may never be killed if the parent (Discord/Vesktop) is killed unexpectedly
    // maybe use http://npmjs.com/package/signal-exit
    // onExit(() => proc.kill())
    const proc = spawn("playerctl", ["metadata", "--follow", "--all-players", "--format", format]);

    const lineStream = proc.stdout.pipe(createStreamSplitter());

    for await (const line of lineStream) {
        try {
            const fields = line.split(sep);
            if (fields.length !== FIELDS.length) return;

            const data = Object.fromEntries<PlayerData>(FIELDS.map((f, i) => [f, fields[i]]));
            console.log(data);
        } catch (e) {
            console.error("Failed to parse JSON:", e);
        }
    }
}
