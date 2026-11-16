/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Build-time globals from src/globals.d.ts are not present in Node.
Object.assign(globalThis, {
    IS_WEB: true,
    IS_EXTENSION: false,
    IS_USERSCRIPT: false,
    IS_STANDALONE: true,
    IS_UPDATER_DISABLED: true,
    IS_DEV: false,
    IS_REPORTER: false,
    IS_ANTI_CRASH_TEST: false,
    IS_DISCORD_DESKTOP: false,
    IS_VESKTOP: false,
    VERSION: "0.0.0",
    BUILD_TIMESTAMP: 0,
    DESKTOP_MONACO_EDITOR_URL: ""
});
