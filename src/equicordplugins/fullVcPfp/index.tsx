/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { IconUtils, UserStore } from "@webpack/common";

import style from "./style.css?managed";

interface iUSRBG extends Plugin {
    userHasBackground(userId: string);
    getImageUrl(userId: string): string | null;
}

export default definePlugin({
    name: "FullVCPFP",
    description: "Makes avatars take up the entire vc tile",
    authors: [EquicordDevs.mochienya],
    patches: [
        {
            find: "\"data-selenium-video-tile\":",
            replacement: {
                match: /(?<=function\((\i),\i\)\{)/,
                replace: "$1.style=$self.getVoiceBackgroundStyles($1);",
            }
        }
    ],

    getVoiceBackgroundStyles({ className, participantUserId }: any) {
        if (!className.includes("tile_")) return;
        if (!participantUserId) return;

        const user = UserStore.getUser(participantUserId);
        const avatarUrl = IconUtils.getUserAvatarURL(user, false, 1024);

        if (Settings.plugins.USRBG.enabled && Settings.plugins.USRBG.voiceBackground) {
            const USRBG = (Vencord.Plugins.plugins.USRBG as unknown as iUSRBG);
            if (USRBG.userHasBackground(participantUserId)) {
                document.querySelectorAll('[class*="background_"]').forEach(element => {
                    (element as HTMLElement).style.backgroundColor = "transparent";
                });
                return {
                    backgroundImage: `url(${USRBG.getImageUrl(participantUserId)})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    "--full-res-avatar": `url(${avatarUrl})`
                };
            }
        }

        return {
            "--full-res-avatar": `url(${avatarUrl})`,
        };
    },

    start() {
        enableStyle(style);
    },
    stop() {
        disableStyle(style);
    },
});
