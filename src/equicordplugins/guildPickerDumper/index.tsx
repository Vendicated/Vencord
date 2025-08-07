/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { migratePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { Guild } from "@vencord/discord-types";
import { EmojiStore, Menu, StickersStore } from "@webpack/common";
import { zipSync } from "fflate";

const Patch: NavContextMenuPatchCallback = (children, { guild }: { guild: Guild; }) => {
    // Assuming "privacy" is the correct ID for the group you want to modify.
    const group = findGroupChildrenByChildId("privacy", children);

    if (group) {
        group.push(
            <>
                <Menu.MenuItem id="emoji.download" label="Download Emojis" action={() => zipGuildAssets(guild, "emojis")}></Menu.MenuItem>
                <Menu.MenuItem id="sticker.download" label="Download Stickers" action={() => zipGuildAssets(guild, "stickers")}></Menu.MenuItem>
            </>
        );
    }
};

async function zipGuildAssets(guild: Guild, type: "emojis" | "stickers") {
    const isEmojis = type === "emojis";
    const items = isEmojis
        ? EmojiStore.getGuilds()[guild.id]?.emojis
        : StickersStore.getStickersByGuildId(guild.id);

    if (!items) {
        return console.log("Server not found!");
    }

    const fetchAsset = async e => {
        const ext = e.animated ? ".gif" : ".png";
        const filename = e.id + ext;
        const url = isEmojis
            ? `https://${window.GLOBAL_ENV.MEDIA_PROXY_ENDPOINT}/emojis/${filename}?size=512&quality=lossless`
            : `https://${window.GLOBAL_ENV.MEDIA_PROXY_ENDPOINT}/stickers/${filename}?size=4096&lossless=true`;

        const response = await fetch(url);
        const blob = await response.blob();
        return { file: new Uint8Array(await blob.arrayBuffer()), filename };
    };

    const assetPromises = items.map(e => fetchAsset(e));

    Promise.all(assetPromises)
        .then(results => {
            const zipped = zipSync(Object.fromEntries(results.map(({ file, filename }) => [filename, file])));
            const blob = new Blob([zipped], { type: "application/zip" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${guild.name}-${type}.zip`;
            link.click();
            link.remove();
        })
        .catch(console.error);
}

migratePluginSettings("GuildPickerDumper", "EmojiDumper");
export default definePlugin({
    name: "GuildPickerDumper",
    description: "Context menu to dump and download a server's emojis and stickers.",
    authors: [EquicordDevs.Cortex, Devs.Samwich, EquicordDevs.Synth, EquicordDevs.thororen],
    contextMenus: {
        "guild-context": Patch,
        "guild-header-popout": Patch
    }
});
