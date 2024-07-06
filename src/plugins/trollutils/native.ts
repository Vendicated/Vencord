/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { spawn } from "child_process";

export async function youtube(_, videoId: string) {
    spawn(`start https://youtube.com/watch?v=${videoId}`, [], { shell: true });
}
