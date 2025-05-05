/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readFile } from "fs/promises";

// input may be an API key or Path and an API key should be returned asynchronously.
export async function loadApiKey(_, input: string): Promise<string> {
    if (/[a-zA-Z0-9]{32}/.test(input))
        return input;

    try {
        return await readFile(input, { encoding: "utf-8" });
    } catch (err) {
        console.log("Failed to read api key", err);

        // This helps with backwards compatability, just in case
        // someone has an api key that doesn't test against the
        // regex.
        return input;
    }
}
