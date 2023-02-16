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

import { filters, mapMangledModuleLazy } from "@webpack";
import { SelectedChannelStore } from "@webpack/common";

export interface ChannelTabsProps { guildId: string, channelId: string; }

// TODO: replace with commons export when #450 is merged
const NavigationRouter = mapMangledModuleLazy('"transitionToGuild', {
    transitionTo: filters.byCode('"transitionTo '),
    transitionToGuild: filters.byCode('"transitionToGuild'),
});

let openChannelIndex = 0;
const openChannels: ChannelTabsProps[] = [];

const setCurrentTabTo = (t: ChannelTabsProps) => openChannels[openChannelIndex] = t;
const isTabSelected = (ch: ChannelTabsProps) => openChannels.indexOf(ch) === openChannelIndex;
const isEqualToCurrentTab = (ch: ChannelTabsProps) => openChannels[openChannelIndex].channelId === ch.channelId;
function moveToTab(i: number) {
    if (i < 0 || i >= openChannels.length) return;
    const chnl = openChannels[i];
    openChannelIndex = i;
    if (chnl.channelId !== SelectedChannelStore.getChannelId())
        NavigationRouter.transitionToGuild(chnl.guildId, chnl.channelId);
}
function moveToTabRelative(d: number) {
    const i = d + openChannelIndex;
    if (i < 0 || i >= openChannels.length) return;
    const chnl = openChannels[i];
    openChannelIndex = i;
    if (chnl.channelId !== SelectedChannelStore.getChannelId())
        NavigationRouter.transitionToGuild(chnl.guildId, chnl.channelId);
}
function createTab(t: ChannelTabsProps, messageId?: string) {
    openChannels.push({ ...t });
    openChannelIndex = openChannels.length - 1;
    if (messageId) NavigationRouter.transitionTo(`/channels/${t.guildId}/${t.channelId}/${messageId}`);
}
function closeTab(i: number) {
    openChannels.splice(i, 1);
    if (openChannelIndex === i) moveToTab(Math.max(i - 1, 0));
    if (openChannelIndex > i) openChannelIndex--;
}
function closeCurrentTab() {
    openChannels.splice(openChannelIndex, 1);
    moveToTab(Math.max(openChannelIndex - 1, 0));
}
function shiftCurrentTab(direction: 1 /* right */ | -1 /* left */) {
    const prev = openChannels[openChannelIndex + direction];
    if (!prev || !("channelId" in prev)) return;
    openChannels[openChannelIndex + direction] = openChannels[openChannelIndex];
    openChannels[openChannelIndex] = prev;
    openChannelIndex += direction;
}

export const ChannelTabsUtils = {
    closeCurrentTab, closeTab, createTab, isEqualToCurrentTab, isTabSelected, moveToTab, moveToTabRelative, openChannels, shiftCurrentTab, setCurrentTabTo,
};
