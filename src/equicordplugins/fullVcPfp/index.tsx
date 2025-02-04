/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { disableStyle, enableStyle } from "@api/Styles";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { IconUtils, UserStore } from "@webpack/common";

import style from "./index.css?managed";
export default definePlugin({
    name: "fullVcPfp",
    description: "Makes avatars take up the entire vc tile for a more dynamic and immersive experience 🚀",
    authors: [EquicordDevs.mochienya],
    patches: [{
        find: "\"data-selenium-video-tile\":",
        replacement: {
            match: /(?<=function\((\i),\i\)\{)(?=let.{20,40},style:)/,
            replace: "$1.style=$self.getVoiceBackgroundStyles($1);",
        }
    }],

    getVoiceBackgroundStyles({ className, participantUserId }: any) {
        if (!className.includes("tile_")) return;

        const user = UserStore.getUser(participantUserId);

        const avatarUrl = IconUtils.getUserAvatarURL(user, false, 1024);

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
