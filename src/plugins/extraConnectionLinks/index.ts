/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Cooper/coopeeo, Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

/**
 * platforms that dont open natively
  * ! riot and leage (can't view profiles)
  * ! epic (can't view profiles)
  * ! psn (can't view profiles after sony removed My PlayStation)
  * * roblox (Added)
  * * xbox (Added)
  * ! battle.net (can't view profiles)
  * ! bungie.net (can't view profiles)
  * ! facebook (don't have discord access token for facebook connection)
 **/

/** */
enum contypes {
    Roblox = "Roblox",
    Xbox = "Xbox",
}

const uris = { // name (what shows up on connection on ui), id (an identifier thing)
    [contypes.Roblox]: "https://www.roblox.com/users/${id}/profile",
    [contypes.Xbox]: "https://www.xbox.com/play/user/${name}",
};

const serviceNames = { // What the name part in the discord code calls it.
    [contypes.Roblox]: "Roblox",
    [contypes.Xbox]: "Xbox",
};

export default definePlugin({
    name: "ExtraConnectionLinks",
    description: "Adds the Open Profile button to connections that don't natively have it in the regular Discord client.",
    authors: [Devs.coopeeo],
    patches: makePatches(),
});


function makePatches() {
    return Object.keys(contypes)
        .filter(v => isNaN(Number(v)))
        .map(key => {
            const contype = contypes[key as keyof typeof contypes];
            return {
                find: "getPlatformUserUrl:",
                replacement: {
                    match: new RegExp(`(?<=${serviceNames[contype]}",.*},.+)(?=},)`),
                    replace: `, getPlatformUserUrl:e=>{let {name, id} = e; return \`${uris[contype]}\`;}`
                }
            };
        });
}
