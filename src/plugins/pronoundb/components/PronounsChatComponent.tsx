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

import { Settings } from "@api/settings";
import { classes } from "@utils/misc";
import { findByPropsLazy } from "@webpack";
import { UserStore } from "@webpack/common";
import { Message } from "discord-types/general";

import { awaitAndFormatPronouns } from "../pronoundbUtils";

const styles: Record<string, string> = findByPropsLazy("timestampInline");

function shouldShow(message: Message): boolean {
    // Respect showInMessages
    if (!Settings.plugins.PronounDB.showInMessages)
        return false;
    // Don't bother fetching bot or system users
    if (message.author.bot || message.author.system)
        return false;
    // Respect showSelf options
    if (!Settings.plugins.PronounDB.showSelf && message.author.id === UserStore.getCurrentUser().id)
        return false;

    return true;
}

export function PronounsChatComponentWrapper({ message }: { message: Message; }) {
    if (!shouldShow(message))
        return null;

    return <PronounsChatComponent message={message} />;
}

export function CompactPronounsChatComponentWrapper({ message }: { message: Message; }) {
    if (!shouldShow(message))
        return null;

    return <CompactPronounsChatComponent message={message} />;
}

function PronounsChatComponent({ message }: { message: Message; }) {
    const result = awaitAndFormatPronouns(message.author.id);
    if (result != null) {
        return (
            <span
                className={classes(styles.timestampInline, styles.timestamp)}
            >• {result}</span>
        );
    }

    return null;
}

export function CompactPronounsChatComponent({ message }: { message: Message; }) {
    const result = awaitAndFormatPronouns(message.author.id);
    if (result != null) {
        return (
            <span
                className={classes(styles.timestampInline, styles.timestamp, "vc-pronoundb-compact")}
            >• {result}</span>
        );
    }

    return null;
}
