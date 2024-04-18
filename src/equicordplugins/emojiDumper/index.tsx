/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu } from "@webpack/common";
import type { Guild } from "discord-types/general";
import { zipSync } from "fflate";

const Patch: NavContextMenuPatchCallback = (children, { guild }: { guild: Guild; }) => {
    // Assuming "privacy" is the correct ID for the group you want to modify.
    const group = findGroupChildrenByChildId("privacy", children);

    if (group) {
        group.push(
            <Menu.MenuItem id="emoji.download" label="Download Emojis" action={() => zipServerEmojis(guild)}></Menu.MenuItem>
        );
    }
};

export default definePlugin({
    name: "emojiDumper",
    description: "Context menu to dump and download a server's emojis.",
    authors: [
        EquicordDevs.Cortex,
        Devs.Samwich,
        EquicordDevs.Woosh,
    ],
    start() {
        addContextMenuPatch(["guild-context", "guild-header-popout"], Patch);
    },
    stop() {
        removeContextMenuPatch(["guild-context", "guild-header-popout"], Patch);
    }
});

async function zipServerEmojis(guild: Guild) {

    const emojis = Vencord.Webpack.Common.EmojiStore.getGuilds()[guild.id]?.emojis;
    if (!emojis) {
        return console.log("Server not found!");
    }

    const fetchEmojis = async e => {
        const filename = e.id + (e.animated ? ".gif" : ".png");
        const emoji = await fetch("https://cdn.discordapp.com/emojis/" + filename + "?size=512&quality=lossless").then(res => res.blob());
        return { file: new Uint8Array(await emoji.arrayBuffer()), filename };
    };
    const emojiPromises = emojis.map(e => fetchEmojis(e));

    Promise.all(emojiPromises)
        .then(results => {
            const emojis = zipSync(Object.fromEntries(results.map(({ file, filename }) => [filename, file])));
            const blob = new Blob([emojis], { type: "application/zip" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${guild.name}-emojis.zip`;
            link.click();
            link.remove();
        })
        .catch(error => {
            console.error(error);
        });
}
