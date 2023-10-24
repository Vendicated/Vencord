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
    preventVideoModal: {
        type: OptionType.BOOLEAN,
        description: "Prevent videos from playing in a modal",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "NoMosaic",
    authors: [Devs.AutumnVN, Devs.TheKodeToad],
    description: "Removes Discord new image mosaic",
    tags: ["image", "mosaic", "media"],
    settings,
    patches: [{
        find: "Media Mosaic",
        replacement: [
            {
                match: /mediaLayoutType:\i\.\i\.MOSAIC/,
                replace: 'mediaLayoutType:"RESPONSIVE"',
            },
            {
                match: /\i===\i\.\i\.MOSAIC/,
                replace: "true",
            },
            {
                match: /null!==\(\i=\i\.get\(\i\)\)&&void 0!==\i\?\i:"INVALID"/,
                replace: '"INVALID"',
            },
            {
                match: /\i\.length>1\?\(0,\i\.\i\)\(\i,\i\):{}/,
                replace: "{}",
                predicate: () => settings.store.preventVideoModal
            }
        ],
    }],
    start() {
        enableStyle(style);
    },
    stop() {
        disableStyle(style);
    }
});
