/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export let EXTENSION_BASE_URL: string;
export let EXTENSION_VERSION: string;

if (IS_EXTENSION) {
    const script = document.querySelector("#vencord-script") as HTMLScriptElement;
    EXTENSION_BASE_URL = script.dataset.extensionBaseUrl!;
    EXTENSION_VERSION = script.dataset.version!;
}
