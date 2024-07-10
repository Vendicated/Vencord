/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { exec } from "child_process";

export function encryptMessage(_, message: string): Promise<string> {
    const gpgCommand = `echo "${message}" | gpg --encrypt --armor -r hi@zoeys.computer`;
    return new Promise((resolve, reject) => {
        exec(gpgCommand, (error, stdout, stderr) => {
            if (error) {
                return reject(new Error(stderr));
            }
            resolve(stdout);
        });
    });
}
