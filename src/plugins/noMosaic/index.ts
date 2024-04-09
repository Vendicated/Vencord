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

const MAX_WIDTH = 550;
const MAX_HEIGHT = 350;

const settings = definePluginSettings({
    inlineVideo: {
        description: "Play videos without carousel modal",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
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
                replace: "mediaLayoutType:'RESPONSIVE'",
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
            replacement: [{
                match: /\i===\i\.\i\.MOSAIC/,
                replace: "true"
            },
            {
                match: /\i!==\i\.\i\.MOSAIC/,
                replace: "false"
            }]
        },
        {
            find: ".messageAttachment,",
            replacement: {
                match: /\{width:\i,height:\i\}=(\i).*?(?=className:\i\(\)\(\i\.messageAttachment,)/,
                replace: "$&style:$self.style($1),"
            }
        }
    ],

    style({ width, height }) {
        if (!width || !height) return {};

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            if (width / height > MAX_WIDTH / MAX_HEIGHT) {
                height = Math.ceil(MAX_WIDTH / (width / height));
                width = MAX_WIDTH;
            } else {
                width = Math.ceil(MAX_HEIGHT * (width / height));
                height = MAX_HEIGHT;
            }
        }

        return {
            maxWidth: width,
            width: "100%",
            aspectRatio: `${width} / ${height}`
        };

    },

    start() {
        enableStyle(style);
    },

    stop() {
        disableStyle(style);
    }
});
