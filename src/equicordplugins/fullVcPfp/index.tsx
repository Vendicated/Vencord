/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled } from "@api/PluginManager";
import { disableStyle, enableStyle } from "@api/Styles";
import usrbg from "@plugins/usrbg";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { IconUtils, UserStore } from "@webpack/common";

import style from "./style.css?managed";

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
        },
        {
            find: '"VideoBackground-web"',
            predicate: () => isPluginEnabled(usrbg.name) && usrbg.settings.store.voiceBackground,
            replacement: {
                match: /backgroundColor:.{0,25},\{style:(?=\i\?)/,
                replace: "$&$self.userHasBackground(arguments[0]?.userId)?null:",
            }
        }
    ],

    getVoiceBackgroundStyles({ className, participantUserId }: any) {
        if (!className.includes("tile") || !participantUserId) return;

        const user = UserStore.getUser(participantUserId);
        const avatarUrl = IconUtils.getUserAvatarURL(user, false, 1024);
        const style: Record<string, string> = {
            "--full-res-avatar": `url(${avatarUrl})`
        };

        if (isPluginEnabled(usrbg.name) && usrbg.settings.store.voiceBackground && this.userHasBackground(participantUserId)) {
            Object.assign(style, {
                backgroundImage: `url(${usrbg.getImageUrl(participantUserId)})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat"
            });
        }

        return style;
    },

    userHasBackground(userId: string) {
        return usrbg.userHasBackground(userId);
    },

    start() {
        enableStyle(style);
    },
    stop() {
        disableStyle(style);
    },
});
