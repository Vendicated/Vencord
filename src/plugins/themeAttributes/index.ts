/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { Message, User } from "@vencord/discord-types";
import { MessageReferenceType } from "@vencord/discord-types/enums";
import { UserStore } from "@webpack/common";

interface Grouping {
    first: boolean;
    last: boolean;
}

interface MessageProps {
    groupId: string;
    id: string;
    message: Message;
    grouping?: Grouping;
}

export default definePlugin({
    name: "ThemeAttributes",
    description: "Adds data attributes to various elements for theming purposes",
    tags: ["Appearance", "Customisation"],
    authors: [Devs.Ven, Devs.Board, Devs.doggybootsy],

    patches: [
        // Add data-tab-id to all tab bar items
        // This for examples applies to the User and Server settings sidebars
        {
            find: ".tabBarRef",
            replacement: {
                match: /style:this\.getStyle\(\),role:\i/,
                replace: "$&,'data-tab-id':this?.props?.id"
            }
        },

        // Add data-author-id and data-is-self to all messages
        {
            find: "Message must not be a thread starter message",
            replacement: [
                {
                    match: /"aria-setsize":-1,(?=.{0,150}?#{intl::MESSAGE_A11Y_ROLE_DESCRIPTION})/,
                    replace: "...$self.getMessageProps(arguments[0]),$&"
                },
                {
                    match: /(return{channelStreamMarkup:)(\i),/,
                    replace: "$1$self.handleChannelStreamMarkup($2),"
                },
                {
                    match: /("collapsed-message-item"\),\i\?)(\i\.content\.map)/,
                    replace: "$1$self.handleBlockedOrIgnoredMessages=$2"
                }
            ]
        },

        // add --avatar-url-<resolution> css variable to avatar img elements
        // popout profiles
        {
            find: "#{intl::LABEL_WITH_ONLINE_STATUS}",
            replacement: [
                {
                    match: /src:(\i)\?\?void 0.{1,50}"aria-hidden":!0/,
                    replace: "$&,style:$self.getAvatarStyles($1)"
                }
            ]
        },
        // chat avatars
        {
            find: "showCommunicationDisabledStyles",
            replacement: {
                match: /src:(\i),"aria-hidden":!0/,
                replace: "$&,style:$self.getAvatarStyles($1)"
            }
        },
        // user modal
        {
            find: "has-animated-banner",
            replacement: {
                match: /"has-animated-banner"\),/,
                replace: "$&...$self.getUserModalProps(arguments[0]),"
            }
        }
    ],

    getUserModalProps(props: { user: User; }) {
        return {
            "data-member-id": props.user.id,
            "data-is-self": props.user.id === UserStore.getCurrentUser()?.id
        };
    },

    set handleBlockedOrIgnoredMessages(v) {
        this.handleChannelStreamMarkup(v);
    },

    handleChannelStreamMarkup(channelStreamMarkup: React.ReactElement<MessageProps>[]) {
        try {
            let index = channelStreamMarkup.findIndex(x => x.props.groupId), pre = -1, future = index + 1;

            if (index === -1) return channelStreamMarkup;

            while (index < channelStreamMarkup.length) {
                const element = channelStreamMarkup[index];
                const before: React.ReactElement<MessageProps> | undefined = channelStreamMarkup[pre];

                let next: React.ReactElement<MessageProps> | undefined;

                while (future < channelStreamMarkup.length) {
                    const after = channelStreamMarkup[future];

                    if (!after.props.groupId) {
                        future++;
                        continue;
                    }

                    next = after;
                    break;
                }

                let first = true;
                if (typeof before === "object") {
                    first = before.props.groupId !== element.props.groupId;
                }

                let last = false;
                if (!next) last = true;
                else if (element.props.groupId !== next.props.groupId) last = true;

                channelStreamMarkup[index].props.grouping = { first, last };

                pre = index;
                index = future++;
            }
        }
        catch (err) {
            new Logger("ThemeAttributes").error("Error in channelStreamMarkup", err);
        }

        return channelStreamMarkup;
    },

    getAvatarStyles(src: string | null) {
        if (typeof src !== "string" || src.startsWith("data:")) return {};

        return Object.fromEntries(
            [128, 256, 512, 1024, 2048, 4096].map(size => [
                `--avatar-url-${size}`,
                `url(${src.replace(/\d+$/, String(size))})`
            ])
        );
    },

    getMessageProps(props: MessageProps) {
        try {
            const author = props.message?.author;
            const authorId = author?.id;

            return {
                "data-message-group-start": props.grouping?.first,
                "data-message-group-end": props.grouping?.last,
                "data-author-id": authorId,
                "data-author-username": author?.username,
                "data-is-self": authorId && authorId === UserStore.getCurrentUser()?.id,
                "data-is-webhook": author.discriminator === "0000" && author.bot,
                "data-author-is-deleted": author.id === "456226577798135808",
                "data-is-bot": author.bot && author.discriminator !== "0000",
                "data-message-is-reply": props.message.messageReference?.type === MessageReferenceType.DEFAULT,
                "data-message-is-forward": props.message.messageReference?.type === MessageReferenceType.FORWARD,
            };
        } catch (e) {
            new Logger("ThemeAttributes").error("Error in getMessageProps", e);
            return {};
        }
    }
});
