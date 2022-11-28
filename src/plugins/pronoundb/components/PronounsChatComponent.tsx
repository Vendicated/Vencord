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
import { classes, useAwaiter } from "@utils/misc";
import { findByPropsLazy } from "@webpack";
import { UserStore } from "@webpack/common";
import { Message } from "discord-types/general";

import { fetchPronouns, formatPronouns } from "../pronoundbUtils";
import { PronounMapping } from "../types";

const styles: Record<string, string> = findByPropsLazy("timestampInline");

export default function PronounsChatComponentWrapper({ message }: { message: Message; }) {
    // Don't bother fetching bot or system users
    if (message.author.bot || message.author.system)
        return null;
    // Respect showSelf options
    if (!Settings.plugins.PronounDB.showSelf && message.author.id === UserStore.getCurrentUser().id)
        return null;

    return <PronounsChatComponent message={message} />;
}

function PronounsChatComponent({ message }: { message: Message; }) {
    const [result, , isPending] = useAwaiter(
        () => fetchPronouns(message.author.id),
        null,
        e => console.error("Fetching pronouns failed: ", e)
    );

    // If the promise completed, the result was not "unspecified", and there is a mapping for the code, then return a span with the pronouns
    if (!isPending && result && result !== "unspecified" && PronounMapping[result]) {
        return (
            <span
                className={classes(styles.timestampInline, styles.timestamp)}
            >• {formatPronouns(result)}</span>
        );
    }

    return null;
}
