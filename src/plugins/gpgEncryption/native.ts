/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { exec } from "child_process";

let selfKey: string = "";
let recipientKey: string = "";

function executeCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                return reject(new Error(stderr));
            }
            resolve(stdout);
        });
    });
}

export function encryptMessage(_, message: string): Promise<string> {
    if (selfKey.length === 0) {
        return Promise.resolve(
            `[NOT ENCRYPTED - REGISTER SELF KEY] ${message}`,
        );
    }
    if (recipientKey.length === 0) {
        return Promise.resolve(
            `[NOT ENCRYPTED - REGISTER RECIPIENT KEY] ${message}`,
        );
    }
    const gpgCommand = `echo "${message}" | gpg --encrypt --armor -r ${selfKey} -r ${recipientKey}`;
    return executeCommand(gpgCommand);
}

export function getPublicKey(_, keyId: string): Promise<string> {
    const gpgCommand = `gpg --armor --export ${keyId}`;
    return executeCommand(gpgCommand);
}

export function decryptMessage(_, message: string): Promise<string> {
    const gpgCommand = `echo "${message}" | gpg --decrypt --armor`;
    return executeCommand(gpgCommand);
}

export function registerSelfKey(_, keyId: string): Promise<string> {
    selfKey = keyId;
    return Promise.resolve(keyId);
}

export function registerRecipientKey(_, keyId: string): Promise<string> {
    recipientKey = keyId;
    return Promise.resolve(keyId);
}
