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

import { definePluginSettings } from "@api/settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { LazyComponent } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { find, findStoreLazy } from "@webpack";
import { ChannelStore, GuildMemberStore, Tooltip, UserStore, useStateFromStores } from "@webpack/common";

const ThreeDots = LazyComponent(() => find(m => m.type?.render?.toString()?.includes("().dots")));
const TypingStore = findStoreLazy("TypingStore");
const UserGuildSettingsStore = findStoreLazy("UserGuildSettingsStore");

function getDisplayName(guildId: string, userId: string) {
    return GuildMemberStore.getMember(guildId, userId)?.nick ?? UserStore.getUser(userId).username;
}

function TypingIndicator({ channelId }: { channelId: string; }) {
    const guildId = ChannelStore.getChannel(channelId).guild_id;

    if (!settings.store.includeMutedChannels) {
        const isChannelMuted = UserGuildSettingsStore.isChannelMuted(guildId, channelId);
        if (isChannelMuted) return null;
    }

    const typingUsers: Record<string, number> = useStateFromStores(
        [TypingStore],
        () => ({ ...TypingStore.getTypingUsers(channelId) as Record<string, number> }),
        null,
        (old, current) => {
            const oldKeys = Object.keys(old);
            const currentKeys = Object.keys(current);

            return oldKeys.length === currentKeys.length && JSON.stringify(oldKeys) === JSON.stringify(currentKeys);
        }
    );

    const typingUsersArray = Object.keys(typingUsers);
    let tooltipText: string;

    switch (typingUsersArray.length) {
        case 0: break;
        case 1: {
            tooltipText = `${getDisplayName(guildId, typingUsersArray[0])} is typing...`;
            break;
        }
        case 2: {
            tooltipText = `${getDisplayName(guildId, typingUsersArray[0])} and ${getDisplayName(guildId, typingUsersArray[1])} are typing...`;
            break;
        }
        case 3: {
            tooltipText = `${getDisplayName(guildId, typingUsersArray[0])}, ${getDisplayName(guildId, typingUsersArray[1])} and ${getDisplayName(guildId, typingUsersArray[2])} are typing...`;
            break;
        }
        default: {
            tooltipText = `${getDisplayName(guildId, typingUsersArray[0])}, ${getDisplayName(guildId, typingUsersArray[1])} and ${typingUsersArray.length - 2} others are typing...`;
            break;
        }
    }

    if (typingUsersArray.length > 0) {
        return (
            <Tooltip text={tooltipText!}>
                {({ onMouseLeave, onMouseEnter }) => (
                    <div
                        style={{ marginLeft: 6, zIndex: 0, cursor: "pointer" }}
                        onMouseLeave={onMouseLeave}
                        onMouseEnter={onMouseEnter}
                    >
                        <ThreeDots dotRadius={3} themed={true} />
                    </div>
                )}
            </Tooltip>
        );
    }

    return null;
}

const settings = definePluginSettings({
    includeMutedChannels: {
        type: OptionType.BOOLEAN,
        description: "Wheter to show the typing indicator for muted channels.",
        default: false
    }
});

export default definePlugin({
    name: "TypingIndicator",
    description: "Adds an indicator if someone is typing on a channel.",
    authors: [Devs.Nuckyz],
    settings,

    patches: [
        {
            find: ".UNREAD_HIGHLIGHT",
            replacement: {
                match: /(?<=(?<channel>\i)=\i\.channel,.+?\(\)\.children.+?:null)/,
                replace: ",$self.TypingIndicator($<channel>.id)"
            }
        }
    ],

    TypingIndicator: (channelId: string) => (
        <ErrorBoundary noop>
            <TypingIndicator channelId={channelId} />
        </ErrorBoundary>
    ),
});
