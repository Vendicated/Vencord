/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByCodeLazy } from "@webpack";

const normalMessageComponent = findByCodeLazy(".USER_MENTION)");

export default definePlugin({
    name: "FullUserInChatbox",
    description: "Adds the normal mention to the user chatbox, see the readme for more details and a full list of benefits.",
    authors: [Devs.sadan],

    patches: [
        {
            find: "UNKNOWN_ROLE_PLACEHOLDER]",
            replacement: {
                match: /(hidePersonalInformation.{0,170}?)return/,
                replace: "$1return $self.patchChatboxMention(arguments[0]);"
            }
        }
    ],

    patchChatboxMention(props: any) {
        return normalMessageComponent({
            className: "mention",
            userId: props.id,
            channelId: props.channelId,
            inlinePreview: undefined
        });
    }
});
