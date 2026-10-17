/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getUserSettingLazy } from "@api/UserSettings";
import type { Theme } from "@vencord/discord-types";
import { findByCodeLazy } from "@webpack";
import { showToast, ThemeStore, VoiceActions } from "@webpack/common";

import type { PaletteCommand } from "../api/types";
import { CircleIcon, HeadphonesIcon, MicIcon, MoonIcon } from "../ui/icons";

const SECTION = "Discord";

const StatusSetting = getUserSettingLazy<string>("status", "status");
const updateDiscordTheme = findByCodeLazy('type:"UNSYNCED_USER_SETTINGS_UPDATE', '"system"===');

const THEMES = [
    { value: "light", label: "Light" },
    { value: "darker", label: "Ash" },
    { value: "dark", label: "Dark" },
    { value: "midnight", label: "Onyx" }
] as const satisfies ReadonlyArray<{ value: Theme; label: string; }>;

const STATUSES = [
    { value: "online", label: "Online" },
    { value: "idle", label: "Idle" },
    { value: "dnd", label: "Do Not Disturb" },
    { value: "invisible", label: "Invisible" }
];

export const discordCommands: PaletteCommand[] = [
    {
        id: "discord.toggleMute",
        title: "Toggle Mute",
        section: SECTION,
        keywords: ["mute", "microphone", "voice"],
        icon: MicIcon,
        actions: [{
            id: "run",
            label: "Toggle Mute",
            run: () => VoiceActions.toggleSelfMute()
        }]
    },
    {
        id: "discord.toggleDeafen",
        title: "Toggle Deafen",
        section: SECTION,
        keywords: ["deafen", "audio", "voice"],
        icon: HeadphonesIcon,
        actions: [{
            id: "run",
            label: "Toggle Deafen",
            run: () => VoiceActions.toggleSelfDeaf()
        }]
    },
    {
        id: "discord.setStatus",
        title: "Set Status",
        section: SECTION,
        keywords: ["status", "online", "idle", "dnd", "invisible", "presence"],
        icon: CircleIcon,
        page: () => ({
            title: "Set Status",
            icon: CircleIcon,
            spec: {
                type: "list",
                placeholder: "Search statuses...",
                items: () => STATUSES.map(status => ({
                    id: status.value,
                    label: status.label,
                    sublabel: StatusSetting?.getSetting() === status.value ? "Current" : undefined,
                    icon: CircleIcon,
                    actions: [{
                        id: "set",
                        label: `Set ${status.label}`,
                        run() {
                            StatusSetting?.updateSetting(status.value);
                            showToast({ text: `Status set to ${status.label}.`, variant: "success" });
                        }
                    }]
                }))
            }
        })
    },
    {
        id: "discord.toggleTheme",
        title: "Toggle Theme",
        section: SECTION,
        keywords: ["theme", "light", "ash", "dark", "onyx", "appearance"],
        icon: MoonIcon,
        actions: [{
            id: "run",
            label: "Toggle Theme",
            run() {
                const currentIdx = THEMES.findIndex(theme => theme.value === ThemeStore.theme);
                const next = THEMES[(currentIdx + 1) % THEMES.length];
                updateDiscordTheme({ theme: next.value });
                showToast({ text: `Theme set to ${next.label}.`, variant: "success" });
            }
        }]
    }
];
