/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app } from "electron";
import { join } from "path";

export const DATA_DIR = process.env.VENCORD_USER_DATA_DIR ?? (
    process.env.DISCORD_USER_DATA_DIR
        ? join(process.env.DISCORD_USER_DATA_DIR, "..", "VencordData")
        : join(app.getPath("userData"), "..", "Vencord")
);
export const SETTINGS_DIR = join(DATA_DIR, "settings");
export const THEMES_DIR = join(DATA_DIR, "themes");
export const QUICKCSS_PATH = join(SETTINGS_DIR, "quickCss.css");
export const SETTINGS_FILE = join(SETTINGS_DIR, "settings.json");
export const ALLOWED_PROTOCOLS = [
    "https:",
    "http:",
    "steam:",
    "spotify:",
    "com.epicgames.launcher:",
];

export const IS_VANILLA = /* @__PURE__ */ process.argv.includes("--vanilla");
