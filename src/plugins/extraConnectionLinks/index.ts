/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Cooper/coopeeo, Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

/**
 * platforms that dont open natively (and the status of them)
  * * Roblox (Added)
  * * Xbox/Xbox Live (Added)
  * * Epic Games (Added)
  * ! Riot Games (can't view profiles)
  * ! Leage of Legends (can't view profiles) (same as Riot Games)
  * ! PSN (no other known way to view profiles after Sony removed My PlayStation)
  * ! Battle.net (can't view profiles)
  * ! Bungie.net (can't view profiles)
  * ! Facebook (don't have discord's token for facebook apis)
  * ! Crunchyroll (can't view other peoples profiles nor your own profile)
  * ! Amazon Music (the id that discord shows is "amzn1.<something>.<random letters and numbers thats not the actual user id>")
 **/

/**
 * All the connection types implemented into this plugin
 */
enum connectionTypes {
    Roblox,
    Xbox,
    Epic,
}

/**
 * The uri to use.
 * There are also two variables that you can use, name and id.
 * The "name" is well the name of the account and the name is what shows up when viewing a connection on a discord profile.
 * The "id" is an identifier that normal users don't see, it will usually be an user id (, for example Roblox has user ids, and discord stores that user id in the id field of the connection).
 * @example [connectionTypes.Xbox]: "https://www.xbox.com/play/user/${name}",
 * @example [connectionTypes.Roblox]: "https://www.roblox.com/users/${id}/profile",
 */
const uris = { // name (what shows up on connection on ui), id (an identifier thing)
    [connectionTypes.Roblox]: "https://www.roblox.com/users/${id}/profile",
    [connectionTypes.Xbox]: "https://www.xbox.com/play/user/${name}",
    [connectionTypes.Epic]: "https://store.epicgames.com/u/${id}",
};

/**
 * What discord has the service named as.
 * @example [connectionTypes.Epic]: "Epic Games",
 */
const serviceNames = {
    [connectionTypes.Roblox]: "Roblox",
    [connectionTypes.Xbox]: "Xbox",
    [connectionTypes.Epic]: "Epic Games",
};

export default definePlugin({
    name: "ExtraConnectionLinks",
    description: "Allows you to open more connections in browser!",
    authors: [Devs.coopeeo],
    patches: Object.keys(connectionTypes)
        .filter(v => isNaN(Number(v)))
        .map(key => {
            const connectionTypeSelected = connectionTypes[key as keyof typeof connectionTypes];
            return {
                find: "getPlatformUserUrl:",
                replacement: {
                    match: new RegExp(`(?<=${serviceNames[connectionTypeSelected]}",.*},.+)(?=},)`),
                    replace: `, getPlatformUserUrl:e=>{let {name, id} = e; return \`${uris[connectionTypeSelected]}\`;}`
                }
            };
        }),
});
