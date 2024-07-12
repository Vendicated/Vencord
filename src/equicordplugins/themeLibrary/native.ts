/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";
import { existsSync, type PathLike, writeFileSync } from "fs";
import { join } from "path";

import type { Theme } from "./types";

export async function themeExists(_: IpcMainInvokeEvent, dir: PathLike, theme: Theme) {
    return existsSync(join(dir.toString(), `${theme.name}.theme.css`));
}

export function getThemesDir(_: IpcMainInvokeEvent, dir: PathLike, theme: Theme) {
    return join(dir.toString(), `${theme.name}.theme.css`);
}

export async function downloadTheme(_: IpcMainInvokeEvent, dir: PathLike, theme: Theme) {
    if (!theme.content || !theme.name) return;
    const path = join(dir.toString(), `${theme.name}.theme.css`);
    writeFileSync(path, Buffer.from(theme.content, "base64"));
}
