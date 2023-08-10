/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classes } from "@utils/misc";
import { findByPropsLazy } from "@webpack";
import { UserStore } from "@webpack/common";
import { Message } from "discord-types/general";

import { useFormattedPronouns } from "../pronoundbUtils";
import { settings } from "../settings";

const styles: Record<string, string> = findByPropsLazy("timestampInline");

const AUTO_MODERATION_ACTION = 24;

function shouldShow(message: Message): boolean {
    if (!settings.store.showInMessages)
        return false;
    if (message.author.bot || message.author.system || message.type === AUTO_MODERATION_ACTION)
        return false;
    if (!settings.store.showSelf && message.author.id === UserStore.getCurrentUser().id)
        return false;

    return true;
}

export function PronounsChatComponentWrapper({ message }: { message: Message; }) {
    return shouldShow(message)
        ? <PronounsChatComponent message={message} />
        : null;
}

export function CompactPronounsChatComponentWrapper({ message }: { message: Message; }) {
    return shouldShow(message)
        ? <CompactPronounsChatComponent message={message} />
        : null;
}

function PronounsChatComponent({ message }: { message: Message; }) {
    const [result] = useFormattedPronouns(message.author.id);

    return result
        ? (
            <span
                className={classes(styles.timestampInline, styles.timestamp)}
            >• {result}</span>
        )
        : null;
}

export function CompactPronounsChatComponent({ message }: { message: Message; }) {
    const [result] = useFormattedPronouns(message.author.id);

    return result
        ? (
            <span
                className={classes(styles.timestampInline, styles.timestamp, "vc-pronoundb-compact")}
            >• {result}</span>
        )
        : null;
}
