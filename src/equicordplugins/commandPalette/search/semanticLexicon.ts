/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const SEMANTIC_SYNONYMS: Record<string, string[]> = {
    send: ["message", "dm", "whisper", "pm", "chat", "text", "tell"],
    message: ["dm", "pm", "whisper", "chat", "text"],
    open: ["launch", "show", "view", "jump"],
    go: ["navigate", "visit", "switch"],
    settings: ["preferences", "config", "configure", "option"],
    toggle: ["enable", "disable", "switch", "turn"],
    plugin: ["extension", "addon", "module"],
    dm: ["direct", "message", "private", "whisper", "pm"],
    url: ["link", "website", "site", "web"]
};

export const INTENT_HINTS: Record<string, string[]> = {
    send_message: ["send", "msg", "dm", "message", "tell", "whisper", "pm"],
    open_dm: ["open", "dm", "direct", "message"],
    go_to: ["go", "navigate", "jump", "channel", "guild", "server"],
    open_settings: ["open", "settings", "preferences", "config"],
    toggle_plugin: ["toggle", "plugin", "enable", "disable"],
    open_url: ["url", "link", "website", "open"]
};
