/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import style from "./styles.css?managed";

const settings = definePluginSettings({
    inlineVideo: {
        description: "Play videos without carousel modal",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    mediaLayoutType: {
        description: "Choose media layout type",
        type: OptionType.SELECT,
        restartNeeded: true,
        options: [
            { label: "STATIC, render loading image but image isn't resposive, no problem unless discord window width is too small", value: "STATIC", default: true },
            { label: "RESPONSIVE, image is responsive but not render loading image, cause messages shift when loaded", value: "RESPONSIVE" },
        ]
    }
});

export default definePlugin({
    name: "NoMosaic",
    authors: [Devs.AutumnVN],
    description: "Removes Discord new image mosaic",
    tags: ["image", "mosaic", "media"],

    settings,

    patches: [
        {
            find: ".oneByTwoLayoutThreeGrid",
            replacement: [{
                match: /mediaLayoutType:\i\.\i\.MOSAIC/,
                replace: "mediaLayoutType:$self.mediaLayoutType()",
            },
            {
                match: /null!==\(\i=\i\.get\(\i\)\)&&void 0!==\i\?\i:"INVALID"/,
                replace: '"INVALID"',
            }]
        },
        {
            find: "renderAttachments(",
            predicate: () => settings.store.inlineVideo,
            replacement: {
                match: /url:(\i)\.url\}\);return /,
                replace: "$&$1.content_type?.startsWith('image/')&&"
            }
        },
        {
            find: "Messages.REMOVE_ATTACHMENT_TOOLTIP_TEXT",
            replacement: {
                match: /\i===\i\.\i\.MOSAIC/,
                replace: "true"
            }
        }
    ],

    mediaLayoutType() {
        return settings.store.mediaLayoutType;
    },

    start() {
        enableStyle(style);
    },

    stop() {
        disableStyle(style);
    }
});
