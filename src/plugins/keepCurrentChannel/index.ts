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
import { ChannelRouter, SelectedChannelStore, SelectedGuildStore } from "@webpack/common";

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

let isSwitchingAccount = false;
let previousCache: PreviousChannel | undefined;

export default definePlugin({
    name: "KeepCurrentChannel",
    description: "Attempt to navigate to the channel you were in before switching accounts or loading Discord.",
    authors: [Devs.Nuckyz],

    flux: {
        LOGOUT(e: LogoutEvent) {
            ({ isSwitchingAccount } = e);
        },

        CONNECTION_OPEN() {
            if (!isSwitchingAccount) return;
            isSwitchingAccount = false;

            if (previousCache?.channelId) {
                ChannelRouter.transitionToChannel(previousCache.channelId);
            }
        },

        async CHANNEL_SELECT({ guildId, channelId }: ChannelSelectEvent) {
            if (isSwitchingAccount) return;

            previousCache = {
                guildId,
                channelId
            };
            await DataStore.set("KeepCurrentChannel_previousData", previousCache);
        }
    },

    async start() {
        previousCache = await DataStore.get<PreviousChannel>("KeepCurrentChannel_previousData");
        if (!previousCache) {
            previousCache = {
                guildId: SelectedGuildStore.getGuildId(),
                channelId: SelectedChannelStore.getChannelId() ?? null
            };

            await DataStore.set("KeepCurrentChannel_previousData", previousCache);
        } else if (previousCache.channelId) {
            ChannelRouter.transitionToChannel(previousCache.channelId);
        }
    }
});
