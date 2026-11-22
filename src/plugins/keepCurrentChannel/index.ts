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

import * as DataStore from "@api/DataStore";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore, NavigationRouter, SelectedChannelStore, SelectedGuildStore } from "@webpack/common";

export interface LogoutEvent {
    type: "LOGOUT";
    isSwitchingAccount: boolean;
}

interface ChannelSelectEvent {
    type: "CHANNEL_SELECT";
    channelId: string | null;
    guildId: string | null;
}

interface PreviousChannel {
    guildId: string | null;
    channelId: string | null;
}

let didStart = false;
let isSwitchingAccount = false;
let previousCache: PreviousChannel | undefined;

function save(data: PreviousChannel) {
    previousCache = data;
    DataStore.set("KeepCurrentChannel_previousData", data);
}

function restore({ channelId, guildId }: PreviousChannel) {
    if (!channelId || !ChannelStore.hasChannel(channelId)) {
        if (guildId === "@favorites") {
            NavigationRouter.transitionToGuild("@favorites");
        }
        return;
    }

    NavigationRouter.transitionToGuild(guildId || "@me", channelId);
}

export default definePlugin({
    name: "KeepCurrentChannel",
    description: "Attempt to navigate to the channel you were in before switching accounts or loading Discord.",
    tags: ["Utility", "Organisation"],
    authors: [Devs.Nuckyz],

    patches: [
        {
            find: '"Switching accounts"',
            replacement: {
                match: /goHomeAfterSwitching:\i/,
                replace: "goHomeAfterSwitching:!1"
            }
        }
    ],

    flux: {
        LOGOUT(e: LogoutEvent) {
            ({ isSwitchingAccount } = e);
        },

        CONNECTION_OPEN() {
            if (!isSwitchingAccount) return;
            isSwitchingAccount = false;

            if (previousCache)
                restore(previousCache);
        },

        async CHANNEL_SELECT({ guildId, channelId }: ChannelSelectEvent) {
            if (isSwitchingAccount || !didStart) return;

            save({
                guildId,
                channelId
            });
        }
    },

    async start() {
        previousCache = await DataStore.get<PreviousChannel>("KeepCurrentChannel_previousData");
        if (!previousCache) {
            save({
                guildId: SelectedGuildStore.getGuildId(),
                channelId: SelectedChannelStore.getChannelId() ?? null
            });
        } else {
            restore(previousCache);
        }

        didStart = true;
    }
});
