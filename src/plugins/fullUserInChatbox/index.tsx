/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { ReactNode } from "react";

const UserMentionComponent = findComponentByCodeLazy(".USER_MENTION)");

interface UserMentionComponentProps {
    id: string;
    channelId: string;
    guildId: string;
    OriginalComponent: ReactNode;
}

export default definePlugin({
    name: "FullUserInChatbox",
    description: "Makes the user mention in the chatbox have more functionalities, like left/right clicking",
    authors: [Devs.sadan],

    patches: [
        {
            find: ':"text":',
            replacement: {
                match: /(hidePersonalInformation\).+?)(if\(null!=\i\){.+?return \i)(?=})/,
                replace: "$1return $self.UserMentionComponent({...arguments[0],OriginalComponent:(()=>{$2})()});"
            }
        }
    ],

    UserMentionComponent: ErrorBoundary.wrap((props: UserMentionComponentProps) => (
        <UserMentionComponent
            // This seems to be constant
            className="mention"
            userId={props.id}
            channelId={props.channelId}
        />
    ), {
        fallback: ({ wrappedProps }) => wrappedProps.OriginalComponent
    })
});
