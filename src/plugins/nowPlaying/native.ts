/*
* Vencord, a Discord client mod
* Copyright (c) 2025 Vendicated and benzokones
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import { promises as fs } from "fs";
import path from "path";

export async function getHomeDir(event: any): Promise<string> {
    return process.env.HOME || process.env.USERPROFILE || "";
}

export async function joinPath(event: any, ...paths: string[]): Promise<string> {
    return path.join(...paths);
}

export async function stat(event: any, filePath: string): Promise<{ size: number; }> {
    const stats = await fs.stat(filePath);
    return { size: stats.size };
}

export async function readFile(event: any, filePath: string): Promise<string> {
    return await fs.readFile(filePath, "utf8");
}