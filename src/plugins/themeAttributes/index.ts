/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { UserStore } from "@webpack/common";
import { Message } from "discord-types/general";

const settings = definePluginSettings({
    imgSize: {
        type: OptionType.SELECT,
        description: "The resolution of the image in the --large-avatar-url CSS variable",
        options: ["300", "512", "1024", "2048", "4096"].map(n => ({ label: n, value: n, default: n === "300" })),

    }
});

export default definePlugin({
    name: "ThemeAttributes",
    description: "Adds data attributes to various elements for theming purposes",
    authors: [Devs.Ven, Devs.Board],

    settings,

    patches: [
        // Add data-tab-id to all tab bar items
        // This for examples applies to the User and Server settings sidebars
        {
            find: ".tabBarRef",
            replacement: {
                match: /style:this\.getStyle\(\),role:"tab"/,
                replace: "$&,'data-tab-id':this.props.id"
            }
        },

        // Add data-author-id and data-is-self to all messages
        {
            find: ".messageListItem",
            replacement: {
                match: /\.messageListItem(?=,"aria)/,
                replace: "$&,...$self.getMessageProps(arguments[0])"
            }
        },

        // add --large-avatar-url css variable to avatar img elements
        // popout profiles
        {
            find: ".LABEL_WITH_ONLINE_STATUS",
            replacement: {
                match: /src:null!=\i\?(\i).{1,50}"aria-hidden":!0/,
                replace: "$&,style:{\"--large-avatar-url\":\"url(\"+$1.replace(/\\d+$/,$self.settings.store.imgSize)+\")\"}"
            }
        },
        // chat avatars
        {
            find: "showCommunicationDisabledStyles",
            replacement: {
                match: /src:(\i),"aria-hidden":!0/,
                replace: "$&,style:{\"--large-avatar-url\":\"url(\"+$1.replace(/\\d+$/,$self.settings.store.imgSize)+\")\"}"
            }
        }
    ],

    getMessageProps(props: { message: Message; }) {
        const author = props.message?.author;
        const authorId = author?.id;
        return {
            "data-author-id": authorId,
            "data-author-username": author?.username,
            "data-is-self": authorId && authorId === UserStore.getCurrentUser()?.id,
        };
    }
});
