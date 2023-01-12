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

import { findByCodeLazy } from "@webpack";
import { ChannelStore, GuildStore, PrivateChannelsStore, SelectedChannelStore } from "@webpack/common";
import { Channel, Guild } from "discord-types/general";

export function getCurrentChannel() {
    return ChannelStore.getChannel(SelectedChannelStore.getChannelId());
}

export function getCurrentGuild(): Guild | undefined {
    return GuildStore.getGuild(getCurrentChannel()?.guild_id);
}

export function openPrivateChannel(userId: string) {
    PrivateChannelsStore.openPrivateChannel(userId);
}

const _promptToUpload = findByCodeLazy("UPLOAD_FILE_LIMIT_ERROR");


export function promptToUpload(files: File[], channel: Channel): void {
    // Immediately after the command finishes, Discord clears all input, including pending attachments.
    // Thus, setTimeout is needed to make this execute after Discord cleared the input
    setTimeout(() => _promptToUpload(files, channel, 0), 10);
}
