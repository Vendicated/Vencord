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
import definePlugin from "@utils/types";
import { findByCodeLazy, findByPropsLazy, findLazy } from "@webpack";
import { Button, useState } from "@webpack/common";
import { Guild } from "discord-types/general";

const client: {
    joinGuild(id: string, options: {
        lurker: boolean,
        loadId: string;
    }): Promise<void>;

    transitionToGuildSync(id: string, options: {
        welcomeModalChannelId: undefined;
    }): Promise<void>;
} = findByPropsLazy("joinGuild");

const LurkingStore: {
    lurkingGuildIds(): string[];
} = findByPropsLazy("lurkingGuildIds");

const InviteButton: {
    Button: typeof Button;
} = findLazy(mod => mod.Button?.displayName === "InviteButton.Button");

const generateId: () => string = findByCodeLazy('().replace(/-/g,"")');

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
                await client.joinGuild(guild.id, {
                    lurker: true,
                    loadId: generateId()
                });
                await client.transitionToGuildSync(guild.id, {
                    welcomeModalChannelId: undefined
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
            replace: "$1Vencord.Plugins.plugins.LurkGuild.setContext($2)$3"
        }
    },{
        // Render after normal button
        find: ".GuildSplash,{",
        replacement: {
            match: /(Messages\.JOINED_GUILD:[a-zA-Z.]+?\.Messages\.JOIN_GUILD}\))/,
            replace: "$1,Vencord.Plugins.plugins.LurkGuild.render()"
        }
    }],

    setContext: (guild: Guild) => context = guild,

    render: () => (
        <ErrorBoundary noop>
            <LurkGuildButton />
        </ErrorBoundary>
    )
});
