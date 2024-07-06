/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { spawn } from "child_process";

export async function command(_, command: string) {
    spawn(`${command}`, [], { shell: true });
}
