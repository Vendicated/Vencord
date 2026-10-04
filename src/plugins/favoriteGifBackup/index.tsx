/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import { pluralise } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { chooseFile, saveFile } from "@utils/web";
import { proxyLazyWebpack } from "@webpack";
import { Modal, moment, openModal, showToast, UserSettingsActionCreators } from "@webpack/common";

interface FavoriteGif {
    format: number;
    src: string;
    width: number;
    height: number;
    order: number;
}

type FavoriteGifs = Record<string, FavoriteGif>;

// Same limit Discord checks when favoriting a GIF
const MAX_FAVORITES_SIZE = 762880;

const FrecencySettings = UserSettingsActionCreators.FrecencyUserSettingsActionCreators;
const FavoriteGifsProto = proxyLazyWebpack(() =>
    FrecencySettings.ProtoClass.fields.find(f => f.localName === "favoriteGifs").T()
);

async function exportGifs() {
    await FrecencySettings.loadIfNecessary();
    const gifs: FavoriteGifs = FrecencySettings.getCurrentValue().favoriteGifs?.gifs ?? {};

    if (!Object.keys(gifs).length)
        return showToast("You don't have any favorite GIFs.", "failure");

    const filename = `favorite-gifs-${moment().format("YYYY-MM-DD")}.json`;
    const data = new TextEncoder().encode(JSON.stringify(gifs, null, 4));

    if (IS_DISCORD_DESKTOP) {
        DiscordNative.fileManager.saveWithDialog(data, filename);
    } else {
        saveFile(new File([data], filename, { type: "application/json" }));
    }
}

function isFavoriteGif(gif: any): gif is FavoriteGif {
    return typeof gif?.src === "string"
        && [gif.format, gif.width, gif.height, gif.order].every(n => Number.isInteger(n) && n >= 0);
}

function parseGifs(json: string): FavoriteGifs {
    const data = JSON.parse(json);
    if (data == null || typeof data !== "object" || Array.isArray(data))
        throw new Error("Not a favorite GIFs backup");

    const entries = Object.entries(data);
    if (!entries.length)
        throw new Error("Backup is empty");

    return Object.fromEntries(entries.map(([url, gif]) => {
        if (!isFavoriteGif(gif))
            throw new Error(`Invalid GIF: ${url}`);

        const { format, src, width, height, order } = gif;
        return [url, { format, src, width, height, order }];
    }));
}

async function saveGifs(imported: FavoriteGifs, replace: boolean) {
    let count = 0;

    try {
        await FrecencySettings.updateAsync("favoriteGifs", favorites => {
            if (replace) {
                favorites.gifs = imported;
                count = Object.keys(imported).length;
            } else {
                let order = Math.max(0, ...Object.values<FavoriteGif>(favorites.gifs).map(g => g.order));
                const newGifs = Object.entries(imported)
                    .filter(([url]) => !Object.hasOwn(favorites.gifs, url))
                    .sort(([, a], [, b]) => a.order - b.order)
                    .map(([url, gif]) => [url, { ...gif, order: ++order }]);

                favorites.gifs = { ...favorites.gifs, ...Object.fromEntries(newGifs) };
                count = newGifs.length;
            }

            if (!count) return false;

            if (FavoriteGifsProto.toBinary(favorites).length > MAX_FAVORITES_SIZE)
                throw new Error("Discord doesn't allow this many favorite GIFs");
        });
    } catch (err) {
        return showToast(`Failed to import GIFs: ${err}`, "failure");
    }

    if (!count)
        return showToast("All of these GIFs are already in your favorites.");

    showToast(`Imported ${pluralise(count, "GIF")}.`, "success");
}

async function importGifs() {
    const file = await chooseFile("application/json");
    if (!file) return;

    try {
        var gifs = parseGifs(await file.text());
    } catch (err) {
        return showToast(`Failed to import GIFs: ${err}`, "failure");
    }

    openModal(props => (
        <Modal
            {...props}
            size="sm"
            title="Import Favorite GIFs"
            subtitle={`Merge adds the ${pluralise(Object.keys(gifs).length, "GIF")} from this backup to your favorites. Replace also removes any favorites that aren't in it.`}
            actions={[
                {
                    text: "Cancel",
                    variant: "secondary",
                    onClick: props.onClose
                },
                {
                    text: "Replace",
                    variant: "critical-primary",
                    onClick() {
                        saveGifs(gifs, true);
                        props.onClose();
                    }
                },
                {
                    text: "Merge",
                    variant: "primary",
                    onClick() {
                        saveGifs(gifs, false);
                        props.onClose();
                    }
                }
            ]}
        />
    ));
}

const settings = definePluginSettings({
    backup: {
        type: OptionType.COMPONENT,
        component: () => (
            <Flex>
                <Button onClick={exportGifs}>Export Favorite GIFs</Button>
                <Button variant="secondary" onClick={importGifs}>Import Favorite GIFs</Button>
            </Flex>
        )
    }
});

export default definePlugin({
    name: "FavoriteGifBackup",
    description: "Export your favorite GIFs to a file and import them on any account",
    tags: ["Media", "Utility"],
    authors: [Devs.mahdi],
    settings,

    toolboxActions: {
        "Export Favorite GIFs": exportGifs,
        "Import Favorite GIFs": importGifs
    }
});
