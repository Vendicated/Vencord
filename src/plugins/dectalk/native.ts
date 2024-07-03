/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { spawn } from "child_process";

export async function speak(_, text: string, path: string) {
    path = path.replace(/\\/g, "/");
    if (!path.endsWith("/")) path += "/";
    spawn(`cd "${path}" && say -pre "[:phoneme on]" -post "[:phoneme off]" "${text}"`, [], { shell: true });
}
