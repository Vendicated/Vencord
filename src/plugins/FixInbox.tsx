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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Forms } from "@webpack/common";

export default definePlugin({
    name: "FixInbox",
    description: "Fixes the Unreads Inbox from crashing Discord when you're in lots of guilds.",
    authors: [Devs.Megu],

    patches: [{
        find: "INBOX_OPEN:function",
        replacement: {
            // This function normally dispatches a subscribe event to every guild.
            // this is badbadbadbadbad so we just get rid of it.
            match: /INBOX_OPEN:function.+?\{/,
            replace: "$&return true;"
        }
    }],

    settingsAboutComponent() {
        return (
            <Forms.FormSection>
                <Forms.FormTitle tag="h3">What's the problem?</Forms.FormTitle>
                <Forms.FormText style={{ marginBottom: 8 }}>
                    By default, Discord emits a GUILD_SUBSCRIPTIONS event for every guild you're in.
                    When you're in a lot of guilds, this can cause the gateway to ratelimit you.
                    This causes the client to crash and get stuck in an infinite ratelimit loop as it tries to reconnect.
                </Forms.FormText>

                <Forms.FormTitle tag="h3">How does it work?</Forms.FormTitle>
                <Forms.FormText>
                    This plugin works by stopping the client from sending GUILD_SUBSCRIPTIONS events to the gateway when you open the unreads inbox.
                    This means that not all unreads will be shown, instead only already-subscribed guilds' unreads will be shown, but your client won't crash anymore.
                </Forms.FormText>
            </Forms.FormSection>
        );
    }
});
