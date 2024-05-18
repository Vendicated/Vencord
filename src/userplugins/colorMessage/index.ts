/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import * as Styles from "@api/Styles";
import { makeRange } from "@components/PluginSettings/components";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";

const AuthorStore = findByPropsLazy("useNullableMessageAuthor", "useNullableMessageAuthor");

import style from "./style.css?managed";

export const settings = definePluginSettings({
    saturation: {
        type: OptionType.SLIDER,
        description: "Message color saturation",
        markers: makeRange(0, 100, 10),
        default: 20,
        onChange() {
            updateStyle();
        },
    },
});

function updateStyle() {
    (Styles.requireStyle(style).dom!.sheet!.cssRules[0] as CSSStyleRule)
        .style.setProperty("--98-message-color-saturation", `${settings.store.saturation}`);
}

export default definePlugin({
    name: "ColorMessage",
    description: "Colors message content with author's role color",
    authors: [Devs.Kyuuhachi],
    settings,

    patches: [
        {
            find: 'default.Messages.MESSAGE_EDITED,")"',
            replacement: {
                match: /id:\(0,\w+.getMessageContentId\)\((\w+)\),/,
                replace: '$&style:{"--98-message-color":$self.getMessageColor($1)},'
            }
        },
    ],

    getMessageColor(messageId: string) {
        return AuthorStore.default(messageId).colorString;
    },

    start() {
        Styles.enableStyle(style);
        updateStyle();
    },
    stop() {
        Styles.disableStyle(style);
    },
});
