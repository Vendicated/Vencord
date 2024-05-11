/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { UserStore } from "@webpack/common";
import { Message } from "discord-types/general";

export default definePlugin({
    name: "ThemeAttributes",
    description: "Adds data attributes to various elements for theming purposes",
    authors: [Devs.Ven],

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
