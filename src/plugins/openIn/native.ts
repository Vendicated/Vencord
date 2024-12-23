/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { exec } from "child_process";
import { IpcMainInvokeEvent } from "electron";

export async function openLink(_: IpcMainInvokeEvent, url: string, browserPath: string): Promise<{ success: boolean; error?: string; }> {
    return new Promise(resolve => {
        exec(`"${browserPath}" "${url}"`, error => {
            if (error) {
                resolve({
                    error: `Code: ${error.code}. ${error.message}`,
                    success: false
                });
            } else {
                resolve({
                    success: true
                });
            }
        });
    });
}
