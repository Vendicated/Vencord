/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { UserStore } from "@webpack/common";

const UserMentionComponent = findComponentByCodeLazy(".USER_MENTION)");

interface UserMentionComponentProps {
    id: string;
    channelId: string;
    guildId: string;
}

export default definePlugin({
    name: "testa",
    description: "Makes the user mention in the chatbox have more functionalities, like right clicking",
    authors: [Devs.sadan],

    patches: [
        {
            find: ":\"text\":",
            replacement: {
                match: /(hidePersonalInformation.*?)return/,
                replace: "$1return $self.UserMentionComponent(arguments[0]);"
            }
        }
    ],

    UserMentionComponent: ErrorBoundary.wrap((props: UserMentionComponentProps) => {
        return <UserMentionComponent
            // this seems to be constant
            className="mention"
            userId={props.id}
            channelId={props.channelId}
        />;
    }, {
        fallback: props => {
            let username: string | null = null;
            try {
                username = UserStore.getUser((props as any)?.children?.props?.id)?.username;
                if (username == null) {
                    throw Error("Error getting fallback username");
                }
            } catch (e) {
                console.error(e);
            }
            username ||= "Unknown User";
            return <span style={{
                color: "red",
            }}>@{username}</span>;
        }
    }),
});
