/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, Settings } from "@api/Settings";
import { HeadingSecondary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { EquicordDevs, IS_MAC } from "@utils/constants";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import { showToast, Toasts } from "@webpack/common";

const { VencordNative } = window;

interface ThemeItem {
    name: string;
    id: string;
    type: "local" | "online";
}

let themeList: ThemeItem[] = [];
let currentIndex = 0;

const settings = definePluginSettings({
    includeLocal: {
        type: OptionType.BOOLEAN,
        description: "Include local themes",
        default: true,
    },
    includeOnline: {
        type: OptionType.BOOLEAN,
        description: "Include online themes",
        default: true,
    },
    sortOrder: {
        type: OptionType.SELECT,
        description: "Sort method",
        options: [
            { label: "A-Z", value: "alphabetical", default: true },
            { label: "Z-A", value: "reverse" },
            { label: "Recent", value: "recent" },
        ],
        onChange: async () => {
            themeList = await getAllThemes();
            currentIndex = findCurrentThemeIndex();
        },
    },
    includeLocalOnChange: {
        type: OptionType.COMPONENT,
        component: () => null,
        onChange: async () => {
            themeList = await getAllThemes();
            currentIndex = findCurrentThemeIndex();
        },
    },
    includeOnlineOnChange: {
        type: OptionType.COMPONENT,
        component: () => null,
        onChange: async () => {
            themeList = await getAllThemes();
            currentIndex = findCurrentThemeIndex();
        },
    },
});

async function getAllThemes(): Promise<ThemeItem[]> {
    const themes: ThemeItem[] = [];

    if (settings.store.includeLocal) {
        const localThemes = await VencordNative.themes.getThemesList();
        localThemes.forEach(({ fileName }) => {
            if (!fileName.endsWith(".css") || fileName === "source.theme.css") return;
            themes.push({
                name: Settings.themeNames?.[fileName] || fileName.replace(/\.css$/, ""),
                id: fileName,
                type: "local",
            });
        });
    }

    if (settings.store.includeOnline && Settings.themeLinks) {
        Settings.themeLinks.forEach((link: string) => {
            const cleanLink = link.replace(/^@(?:light|dark)\s+/, "");
            const name = Settings.themeNames?.[cleanLink] || cleanLink.split("/").pop()?.replace(/\.css$/, "") || cleanLink;
            themes.push({
                name,
                id: link,
                type: "online",
            });
        });
    }

    const { sortOrder } = settings.store;
    if (sortOrder === "alphabetical") {
        themes.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    } else if (sortOrder === "reverse") {
        themes.sort((a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: "base" }));
    }

    return themes;
}

function switchTheme(direction: "next" | "prev") {
    if (!themeList) return;

    currentIndex = direction === "next"
        ? (currentIndex + 1) % themeList.length
        : (currentIndex - 1 + themeList.length) % themeList.length;

    const theme = themeList[currentIndex];
    applyTheme(theme);
}

function applyTheme(theme: ThemeItem) {
    if (theme.type === "local") {
        Settings.enabledThemes = [theme.id];
        Settings.enabledThemeLinks = [];
    } else {
        Settings.enabledThemeLinks = [theme.id];
        Settings.enabledThemes = [];
    }
}

function findCurrentThemeIndex() {
    const enabledLocal = Settings.enabledThemes[0];
    const enabledOnline = Settings.enabledThemeLinks[0];

    const idx = themeList.findIndex(t =>
        (t.type === "local" && t.id === enabledLocal) ||
        (t.type === "online" && t.id === enabledOnline)
    );

    return idx !== -1 ? idx : 0;
}

function toggleCurrentTheme(enable: boolean) {
    if (!themeList) return;

    const theme = themeList[currentIndex];
    const isLocal = theme.type === "local";
    const arr = isLocal ? Settings.enabledThemes : Settings.enabledThemeLinks;
    const isEnabled = arr.includes(theme.id);

    if (enable === isEnabled) return;

    if (isLocal) {
        Settings.enabledThemes = enable ? [...arr, theme.id] : arr.filter(t => t !== theme.id);
    } else {
        Settings.enabledThemeLinks = enable ? [...arr, theme.id] : arr.filter(t => t !== theme.id);
    }
}

async function reloadThemes() {
    const oldTheme = themeList[currentIndex];
    themeList = await getAllThemes();

    if (oldTheme) {
        const newIndex = themeList.findIndex(t => t.id === oldTheme.id && t.type === oldTheme.type);
        currentIndex = newIndex !== -1 ? newIndex : findCurrentThemeIndex();
    } else {
        currentIndex = findCurrentThemeIndex();
    }

    showToast(`Reloaded ${themeList.length} themes`, Toasts.Type.SUCCESS);
}

const isCtrl = (e: KeyboardEvent) => IS_MAC ? e.metaKey : e.ctrlKey;

function handleKeyDown(e: KeyboardEvent) {
    if (isCtrl(e) && e.shiftKey && e.altKey) {
        e.preventDefault();
        reloadThemes();
        return;
    }

    if (!(isCtrl(e) && e.shiftKey)) return;

    if (e.key === "ArrowRight") {
        e.preventDefault();
        switchTheme("next");
    } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        switchTheme("prev");
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        toggleCurrentTheme(true);
    } else if (e.key === "ArrowDown") {
        e.preventDefault();
        toggleCurrentTheme(false);
    }
}

export default definePlugin({
    name: "QuickThemeSwitcher",
    description: "Quickly switch between themes using keyboard shortcuts.",
    authors: [EquicordDevs.Prism],
    settings,
    startAt: StartAt.DOMContentLoaded,
    settingsAboutComponent: () => (
        <>
            <HeadingSecondary>Bindings</HeadingSecondary>
            <Paragraph>
                Use Ctrl/Cmd+Shift+Arrows to navigate (Left/Right: cycle themes, Up: enable, Down: disable).
                <br />
                Press Ctrl/Cmd+Shift+Alt to reload the theme list.
            </Paragraph>
        </>
    ),

    async start() {
        themeList = await getAllThemes();
        currentIndex = findCurrentThemeIndex();
        document.addEventListener("keydown", handleKeyDown);
    },

    stop() {
        document.removeEventListener("keydown", handleKeyDown);
        themeList = [];
        currentIndex = 0;
    },
});
