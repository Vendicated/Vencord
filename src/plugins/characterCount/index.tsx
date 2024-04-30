/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./index.css";

import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { useMemo, UserStore } from "@webpack/common";
import { User } from "discord-types/general";

interface CharacterCountProps {
    type: any;
    textValue: string;
    className: string;
    maxCharacterCount?: any;
    showRemainingCharsAfterCount?: boolean;
}

const PremiumCapabilities: {
    canUseIncreasedMessageLength: (user: User) => boolean;
} = findByPropsLazy("canUseIncreasedMessageLength");
const DiscordConstants: {
    MAX_MESSAGE_LENGTH_PREMIUM: number;
    MAX_MESSAGE_LENGTH: number;
} = findByPropsLazy("MAX_MESSAGE_LENGTH_PREMIUM");

const charCountClasses: {
    [key: string]: string;
} = findByPropsLazy("characterCount", "flairContainer");

const cl = classNameFactory("vc-char-count-");

export default definePlugin({
    name: "CharacterCount",
    description: "Display the character count in the chat input",
    authors: [
        Devs.Fres
    ],
    patches: [
        {
            find: "indentCharacterCount]",
            replacement: {
                match: /(\?\(.{0,30}?jsx\)).{0,100}?,({.{0,100}?showRemainingCharsAfterCount.{0,100}?})/,
                replace: "$1($self.CharacterCount,$2"
            }
        },
        {
            find: "slateContainer)",
            replacement: {
                match: /className:.{0,50}?\(\).{0,50}?\.slateContainer/,
                replace: "$&,$self.chatInputClass"
            }
        }
    ],
    chatInputClass: cl("chat-input"),
    CharacterCount: function ({ textValue, type }: CharacterCountProps) {
        const msgLength = textValue.length;

        const maxMessageLength = useMemo(() =>
            PremiumCapabilities.canUseIncreasedMessageLength(UserStore.getCurrentUser()) ?
                DiscordConstants.MAX_MESSAGE_LENGTH_PREMIUM :
                DiscordConstants.MAX_MESSAGE_LENGTH,
        []);

        const className = useMemo(() => classes(
            charCountClasses.characterCount,
            cl("text"),
            msgLength > maxMessageLength ? charCountClasses.error : null
        ), [msgLength]);

        return <div
            className={className}>
            {msgLength}/{maxMessageLength}
        </div>;
    }
});
