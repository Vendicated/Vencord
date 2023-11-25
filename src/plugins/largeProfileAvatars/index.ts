/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, Board, and contributors
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
        Devs.Board
    ],

    settings,

    patches: [
        {
            find: ".LABEL_WITH_ONLINE_STATUS",
            replacement: {
                match: /("img",{src:null!=\i\?)(\i)/,
                replace: "$1($2.replace(/(80|128)$/,$self.settings.store.imgSize))"
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
