/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and Board
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import styles from "./styles.css?managed";

const settings = definePluginSettings({
    imgSize: {
        type: OptionType.SELECT,
        description: "The resolution of the avatar image",
        options: ["300", "512", "1024", "2048", "4096"].map(n => ({ label: n, value: n, default: n === "300" })),
    }
});

export default definePlugin({
    name: "LargeProfileAvatars",
    description: "Makes avatars take up the full width of the profile modal and scales resolution accordingly",
    authors: [
        Devs.board
    ],

    settings,

    patches: [
        {
            find: "getUserAvatarURL:",
            replacement: {
                match: /(\i=arguments\.length>2&&void .!==arguments\[2\]\?)arguments\[2\](:f\.AVATAR_SIZE)/,
                replace: "$1(arguments[2]==80?$self.settings.store.imgSize:arguments[2])$2"
            }
        }
    ],

    start() {
        enableStyle(styles);
    },

    stop() {
        disableStyle(styles);
    }
});
