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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, NavigationRouter, SelectedChannelStore } from "@webpack/common";

const settings = definePluginSettings({
    openOnSingleClick: {
        type: OptionType.BOOLEAN,
        description: "Open the voice channel on single click without joining it",
        default: false
    }
});

const timers = {} as Record<string, {
    timeout?: NodeJS.Timeout;
    i: number;
}>;

export default definePlugin({
    name: "VoiceChatDoubleClick",
    description: "Join voice chats via double click instead of single click",
    tags: ["Voice"],
    authors: [Devs.Ven, Devs.D3SOX],
    settings,
    patches: [
        // Stage Channels & Voice Channels
        // the find is for stage channels, but it also handles voice
        // channels because they're both in the same concatenated module
        // the find for voice channels was `.handleVoiceStatusClick`
        {
            find: ".handleClickChat",
            // hack: these are not React onClick, it is a custom prop handled by Discord
            // thus, replacing this with onDoubleClick won't work, and you also cannot check
            // e.detail since instead of the event they pass the channel.
            // do this timer workaround instead
            replacement: [
                {
                    match: /onClick:\(\)=>\{this.handleClick\(\)/g,
                    replace: "onClick:()=>{$self.schedule(()=>{this.handleClick()},this)",
                },
            ]
        },
        {
            // channel mentions
            find: 'className:"channelMention",children:[null!=',
            replacement: {
                match: /onClick:(\i)(?=,.{0,30}className:"channelMention".+?(\i)\.inContent)/,
                replace: (_, onClick, props) => ""
                    + `onClick:(vcDoubleClickEvt)=>$self.shouldRunOnClick(vcDoubleClickEvt,${props})&&${onClick}()`,
            }
        }
    ],

    shouldRunOnClick(e: MouseEvent, { channelId }) {
        const channel = ChannelStore.getChannel(channelId);
        if (!channel || ![2, 13].includes(channel.type)) return true;
        if (e.detail === 1) this.openChannel(channel);
        return e.detail >= 2;
    },

    openChannel(channel: { id: string; guild_id: string; }) {
        if (!settings.store.openOnSingleClick) return;
        NavigationRouter.transitionTo(`/channels/${channel.guild_id}/${channel.id}`);
    },

    schedule(cb: () => void, e: any) {
        const { channel } = e.props;
        const id = channel.id as string;
        if (SelectedChannelStore.getVoiceChannelId() === id) {
            cb();
            return;
        }
        // use a different counter for each channel
        const data = (timers[id] ??= { timeout: void 0, i: 0 });
        // clear any existing timer
        clearTimeout(data.timeout);

        // if we already have 2 or more clicks, run the callback immediately
        if (++data.i >= 2) {
            cb();
            delete timers[id];
        } else {
            this.openChannel(channel);
            // else reset the counter in 500ms
            data.timeout = setTimeout(() => {
                delete timers[id];
            }, 500);
        }
    }
});
