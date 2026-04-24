/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ProfileCollectionsAPI",
    description: "API to add collections to the user profile panel like discords game collection.",
    authors: [Devs.thororen],
    patches: [
        // message and member list popouts
        {
            find: /\.POPOUT,onClose:\i}\),nicknameIcons:.+?\.isProvisional/,
            replacement: {
                match: /user:\i,widgets:.{0,100}?\}\),/,
                replace: "$&Vencord.Api.ProfileCollections.renderProfileCollections(arguments[0]),",
            }
        },
        // user panel popout
        {
            find: '"UserProfileAccountPopout"',
            replacement: {
                match: /user:\i,widgets:.{0,100}}\),/,
                replace: "$&Vencord.Api.ProfileCollections.renderProfileCollections(arguments[0]),",
            },
        },
        // dm sidebar
        {
            find: ".SIDEBAR,disableToolbar:",
            replacement: {
                match: /user:(\i),widgets:.{0,100}?\}\),/,
                replace: "$&Vencord.Api.ProfileCollections.renderProfileCollections({...arguments[0],isSideBar:true}),"
            }
        }
    ]
});
