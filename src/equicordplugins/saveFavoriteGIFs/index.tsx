/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType } from "@api/Commands";
import { showNotification } from "@api/Notifications";
import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import equicordToolbox from "@equicordplugins/equicordToolbox";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { saveFile } from "@utils/web";
import { Menu, UserSettingsActionCreators } from "@webpack/common";

async function saveContentToFile(content: string, filename: string) {
    try {
        if (IS_DISCORD_DESKTOP) {
            const data = new TextEncoder().encode(content);
            await DiscordNative.fileManager.saveWithDialog(data, filename);
        } else {
            const file = new File([content], filename, { type: "text/plain" });
            saveFile(file);
        }

        showNotification({
            title: "Save Favorite GIFs",
            body: `Saved GIFs successfully as ${filename}`,
            color: "var(--text-positive)",
        });
    } catch (error) {
        console.error(error);
        showNotification({
            title: "Save Favorite GIFs",
            body: "Failed to save GIFs",
            color: "var(--text-danger)",
        });
    }
}

function getGifUrls(): string[] {
    return Object.keys(UserSettingsActionCreators.FrecencyUserSettingsActionCreators.getCurrentValue().favoriteGifs.gifs);
}

async function saveAllGifs() {
    const filename = `favorite-gifs-${new Date().toISOString().split("T")[0]}.txt`;
    const gifUrls = getGifUrls();

    if (gifUrls.length === 0) {
        showNotification({ title: "Save Favorite GIFs", body: "No favorite GIFs found..?" });
        return;
    }

    const content = gifUrls.join("\n");
    await saveContentToFile(content, filename);
}

async function saveWorkingGifs() {
    const gifUrls = getGifUrls();

    if (gifUrls.length === 0) {
        showNotification({ title: "Save Favorite GIFs", body: "No favorite GIFs found?" });
        return;
    }

    showNotification({
        title: "Save Favorite GIFs",
        body: `Testing ${gifUrls.length} GIFs.. This may take a moment...`,
    });

    const workingUrls: string[] = [];

    await Promise.all(gifUrls.map(async url => {
        try {
            const response = await fetch(url, { method: "HEAD" });
            if (response.ok) workingUrls.push(url);
        } catch (e) {
            try {
                const response = await fetch(url);
                if (response.ok) workingUrls.push(url);
            } catch (err) { }
        }
    }));

    if (workingUrls.length === 0) {
        showNotification({ title: "Save Favorite GIFs", body: "None of your saved GIFs appear to be working." });
        return;
    }

    const filename = `working-gifs-${new Date().toISOString().split("T")[0]}.txt`;
    const content = workingUrls.join("\n");

    await saveContentToFile(content, filename);

    showNotification({
        title: "Save Favorite GIFs",
        body: `Filtered ${gifUrls.length - workingUrls.length} possibly broken GIFs. Saved ${workingUrls.length} working GIFs.`,
        color: "var(--text-positive)",
    });
}

const settings = definePluginSettings({
    showToolboxButton: {
        description: "Show 'Save Favorite GIFs' button in Equicord Toolbox (Requires Reload)",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true,
        get hidden() {
            return !isPluginEnabled(equicordToolbox.name);
        }
    }
});

export default definePlugin({
    name: "SaveFavoriteGIFs",
    description: "Export favorited GIF urls",
    authors: [Devs.thororen],
    settings,
    commands: [
        {
            name: "savegifs",
            description: "Save all favorite GIF urls to a text file",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: saveAllGifs
        },
        {
            name: "saveworkinggifs",
            description: "Test all favorite GIFs and only save the ones that are still working",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: saveWorkingGifs
        }
    ],
    toolboxActions() {
        const { showToolboxButton } = settings.use(["showToolboxButton"]);
        if (!showToolboxButton) return null;

        return (
            <Menu.MenuItem
                id="save-favorite-gifs-toolbox"
                label="Save Favorite GIFs"
                action={saveAllGifs}
            />
        );
    }
});
