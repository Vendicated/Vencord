/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { openUserProfile } from "@utils/discord";
import definePlugin from "@utils/types";
import { User } from "discord-types/general";
import { showToast } from "@webpack/common";



export default definePlugin({
    name: "BetterBlockedContext",
    description: "Allows you to view a users profile by clicking on them in the blocked/ignored list.",
    authors: [Devs.Elvyra],
    patches: [
        {
            find: ".lastRow]",
            replacement: {
                match: /(?<=className:\i.userInfo,)(?=children:.{0,20}user:(\i))/,
                replace: "style:{cursor:'pointer'},onClick:$self.showUserProfile.bind(this,$1),"
            }
        }
    ],

     showUserProfile: (user: User) => {
        Promise.resolve(openUserProfile(user.id)).catch(e =>{
            showToast("Failed to open profile for user '" + user.username + "'! Check the console for more info");
            console.error(e);
        });
     },
});
