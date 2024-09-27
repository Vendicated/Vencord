/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";

const NormalMessageComponent = findComponentByCodeLazy(".USER_MENTION)");

export default definePlugin({
    name: "FullUserInChatbox",
    description: "Puts the full user mention object in the chatbox",
    authors: [Devs.sadan],

    patches: [
        {
            find: "UNKNOWN_ROLE_PLACEHOLDER]",
            replacement: {
                match: /(hidePersonalInformation.*?)return/,
                replace: "$1return $self.patchChatboxMention(arguments[0]);"
            }
        }
    ],

    patchChatboxMention(props: any) {
        return <NormalMessageComponent
            // this seems to be constant
            className="mention"
            userId={props.id}
            channelId={props.channelId}
            // this seems to always be false/undef
            inlinePreview={undefined}
        />;
    },
});
