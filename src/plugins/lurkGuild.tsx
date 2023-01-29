/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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
import { proxyLazy } from "@utils/proxyLazy";
import definePlugin from "@utils/types";
import { findByCodeLazy, findByPropsLazy, findLazy, findModuleId, wreq } from "@webpack";
import { Button, useState } from "@webpack/common";
import { Guild } from "discord-types/general";

const LurkingStore: {
    lurkingGuildIds(): string[];
} = findByPropsLazy("lurkingGuildIds");

const InviteButton: {
    Button: typeof Button;
} = findLazy(mod => mod.Button?.displayName === "InviteButton.Button");

const generateId: () => string = findByCodeLazy('().replace(/-/g,"")');

const lurkGuild: (options: {
    analyticsContext: string,
    categoryId: null,
    guildId: string,
    index: number,
    loadId: string
}) => Promise<void> = proxyLazy(() => {
    const id = findModuleId(".GUILD_DISCOVERY,object:")!;

    const funcName = wreq.m[id].toString()
        .match(/(function ([a-zA-Z_]+)(?:(?!function ).)+\.GUILD_DISCOVERY,object:.*?\.apply\(this,arguments\)})/s)[2];
    return Object.values(wreq(id)).find(v =>
        typeof v === "function" &&
        v.toString().includes(`return ${funcName}.apply(this,arguments)`)) as typeof lurkGuild;
});

var context: Guild;
function LurkGuildButton() {
    // Outside variable can be changed by render of another invite
    const [guild] = useState(context);
    if (guild.joinedAt || !guild.hasFeature("DISCOVERABLE"))
        return null;

    const [submitting, setSubmitting] = useState(false);

    const isLurking = !!LurkingStore.lurkingGuildIds().length;
    return (
        <InviteButton.Button
            isDisabled={isLurking && !submitting}
            submitting={submitting}
            onClick={async () => {
                setSubmitting(true);
                await lurkGuild({
                    analyticsContext: "Popular",
                    categoryId: null,
                    guildId: guild.id,
                    index: 0,
                    loadId: generateId()
                });
            }}>
            {!isLurking ? "Lurk" : "Already lurking"}
        </InviteButton.Button>
    );
}

export default definePlugin({
    name: "LurkGuild",
    description: "Allows to lurk a guild from its invite (needs a guild to be public/discoverable).",
    authors: [{
        name: "пшш",
        id: 559800250924007434n
    }],

    patches: [{
        // Grab invite guild
        find: ".GuildSplash,{",
        replacement: {
            match: /(\.GuildSplash,{guild:)([a-z]+)(})/,
            replace: "$1$self.setContext($2)$3"
        }
    },{
        // Render after normal button
        find: ".GuildSplash,{",
        replacement: {
            match: /(Messages\.JOINED_GUILD:[a-zA-Z.]+?\.Messages\.JOIN_GUILD}\))/,
            replace: "$1,$self.render()"
        }
    }],

    setContext: (guild: Guild) => context = guild,

    render: () => (
        <ErrorBoundary noop>
            <LurkGuildButton />
        </ErrorBoundary>
    )
});
