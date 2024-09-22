/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import ErrorBoundary from "@components/ErrorBoundary";
import { classes } from "@utils/misc";
import { findByPropsLazy } from "@webpack";
import { UserStore } from "@webpack/common";
import { Message } from "discord-types/general";

import { useFormattedPronouns } from "../api";
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

export const PronounsChatComponentWrapper = ErrorBoundary.wrap(({ message }: { message: Message; }) => {
    return shouldShow(message)
        ? <PronounsChatComponent message={message} />
        : null;
}, { noop: true });

export const CompactPronounsChatComponentWrapper = ErrorBoundary.wrap(({ message }: { message: Message; }) => {
    return shouldShow(message)
        ? <CompactPronounsChatComponent message={message} />
        : null;
}, { noop: true });

function PronounsChatComponent({ message }: { message: Message; }) {
    const { pronouns } = useFormattedPronouns(message.author.id);

    return pronouns && (
        <span
            className={classes(styles.timestampInline, styles.timestamp)}
        >• {pronouns}</span>
    );
}

export const CompactPronounsChatComponent = ErrorBoundary.wrap(({ message }: { message: Message; }) => {
    const { pronouns } = useFormattedPronouns(message.author.id);

    return pronouns && (
        <span
            className={classes(styles.timestampInline, styles.timestamp, "vc-pronoundb-compact")}
        >• {pronouns}</span>
    );
}, { noop: true });
