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
import { ChannelStore, FluxDispatcher, NavigationRouter, SelectedChannelStore, SelectedGuildStore } from "@webpack/common";

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


export default definePlugin({
    name: "KeepCurrentChannel",
    description: "Attempt to navigate to the channel you were in before switching accounts or loading Discord.",
    authors: [Devs.Nuckyz],

    isSwitchingAccount: false,
    previousCache: {} as PreviousChannel,

    attemptToNavigateToChannel(guildId: string | null, channelId: string) {
        if (!ChannelStore.hasChannel(channelId)) return;
        NavigationRouter.transitionTo(`/channels/${guildId ?? "@me"}/${channelId}`);
    },

    onLogout(e: LogoutEvent) {
        this.isSwitchingAccount = e.isSwitchingAccount;
    },

    onConnectionOpen() {
        if (!this.isSwitchingAccount) return;
        this.isSwitchingAccount = false;

        if (this.previousCache.channelId) this.attemptToNavigateToChannel(this.previousCache.guildId, this.previousCache.channelId);
    },

    async onChannelSelect({ guildId, channelId }: ChannelSelectEvent) {
        if (this.isSwitchingAccount) return;

        this.previousCache = {
            guildId,
            channelId
        };
        await DataStore.set("KeepCurrentChannel_previousData", this.previousCache);
    },

    async start() {
        const previousData = await DataStore.get<PreviousChannel>("KeepCurrentChannel_previousData");
        if (previousData) {
            this.previousCache = previousData;

            if (this.previousCache.channelId) this.attemptToNavigateToChannel(this.previousCache.guildId, this.previousCache.channelId);
        } else {
            this.previousCache = {
                guildId: SelectedGuildStore.getGuildId(),
                channelId: SelectedChannelStore.getChannelId() ?? null
            };
            await DataStore.set("KeepCurrentChannel_previousData", this.previousCache);
        }

        FluxDispatcher.subscribe("LOGOUT", this.onLogout.bind(this));
        FluxDispatcher.subscribe("CONNECTION_OPEN", this.onConnectionOpen.bind(this));
        FluxDispatcher.subscribe("CHANNEL_SELECT", this.onChannelSelect.bind(this));
    },

    stop() {
        FluxDispatcher.unsubscribe("LOGOUT", this.onLogout);
        FluxDispatcher.unsubscribe("CONNECTION_OPEN", this.onConnectionOpen);
        FluxDispatcher.unsubscribe("CHANNEL_SELECT", this.onChannelSelect);
    }
});
