/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { getIntlMessage } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { GuildChannelStore, GuildMemberStore, RelationshipStore, Tooltip, TypingStore, UserStore, UserSummaryItem, useStateFromStores } from "@webpack/common";

const ThreeDots = findComponentByCodeLazy("Math.min(1,Math.max(", "dotRadius:");

const enum IndicatorMode {
    Dots = 1 << 0,
    Avatars = 1 << 1
}

function getDisplayName(guildId: string, userId: string) {
    const user = UserStore.getUser(userId);
    return GuildMemberStore.getNick(guildId, userId) ?? (user as any).globalName ?? user.username;
}

function getTypingUsersForGuild(guildId: string): string[] {
    const myId = UserStore.getCurrentUser()?.id;
    if (!myId) return [];

    const channels = GuildChannelStore.getChannels(guildId);
    const allChannels = [...channels.SELECTABLE, ...channels.VOCAL];

    const typingUserSet = new Set<string>();
    const { includeBlockedUsers, includeIgnoredUsers } = settings.store;

    for (const { channel } of allChannels) {
        const typingUsers: Record<string, number> = TypingStore.getTypingUsers(channel.id);
        for (const userId of Object.keys(typingUsers)) {
            if (userId === myId) continue;
            if (!includeBlockedUsers && RelationshipStore.isBlocked(userId)) continue;
            if (!includeIgnoredUsers && RelationshipStore.isIgnored(userId)) continue;
            typingUserSet.add(userId);
        }
    }

    return Array.from(typingUserSet);
}

function GuildTypingIndicator({ guildId }: { guildId: string }) {
    const typingUsersArray = useStateFromStores(
        [TypingStore],
        () => getTypingUsersForGuild(guildId)
    );

    if (typingUsersArray.length === 0) return null;

    const [a, b, c] = typingUsersArray;
    let tooltipText: string;

    switch (typingUsersArray.length) {
        case 1:
            tooltipText = getIntlMessage("ONE_USER_TYPING", { a: getDisplayName(guildId, a) });
            break;
        case 2:
            tooltipText = getIntlMessage("TWO_USERS_TYPING", { a: getDisplayName(guildId, a), b: getDisplayName(guildId, b) });
            break;
        case 3:
            tooltipText = getIntlMessage("THREE_USERS_TYPING", { a: getDisplayName(guildId, a), b: getDisplayName(guildId, b), c: getDisplayName(guildId, c) });
            break;
        default:
            tooltipText = getIntlMessage("SEVERAL_USERS_TYPING");
            break;
    }

    const { indicatorMode } = settings.store;
    const showAvatars = (indicatorMode & IndicatorMode.Avatars) === IndicatorMode.Avatars;
    const showDots = (indicatorMode & IndicatorMode.Dots) === IndicatorMode.Dots;

    return (
        <Tooltip text={tooltipText}>
            {props => (
                <div className="vc-guild-typing-indicator" {...props}>
                    {showAvatars && (
                        <div
                            className="vc-guild-typing-avatars"
                            onClick={e => { e.stopPropagation(); e.preventDefault(); }}
                            onKeyPress={e => e.stopPropagation()}
                        >
                            <UserSummaryItem
                                users={typingUsersArray.map(id => UserStore.getUser(id))}
                                guildId={guildId}
                                renderIcon={false}
                                max={3}
                                showDefaultAvatarsForNullUsers
                                showUserPopout
                                size={16}
                            />
                        </div>
                    )}
                    {showDots && (
                        <div className="vc-guild-typing-dots">
                            <ThreeDots dotRadius={3} themed />
                        </div>
                    )}
                </div>
            )}
        </Tooltip>
    );
}

const settings = definePluginSettings({
    indicatorMode: {
        type: OptionType.SELECT,
        description: "How should the indicator be displayed?",
        options: [
            { label: "Avatars and animated dots", value: IndicatorMode.Dots | IndicatorMode.Avatars, default: true },
            { label: "Animated dots", value: IndicatorMode.Dots },
            { label: "Avatars", value: IndicatorMode.Avatars },
        ],
    },
    includeBlockedUsers: {
        type: OptionType.BOOLEAN,
        description: "Whether to show the typing indicator for blocked users.",
        default: false
    },
    includeIgnoredUsers: {
        type: OptionType.BOOLEAN,
        description: "Whether to show the typing indicator for ignored users.",
        default: false
    }
});

export default definePlugin({
    name: "GuildTypingIndicator",
    description: "Shows a typing indicator on guild icons with avatars and names when someone is typing in any channel of that server",
    tags: ["Notifications", "Appearance", "Servers"],
    authors: [{ name: "pergaming1", id: 467243523297509376n }],
    settings,

    patches: [
        {
            find: '("guildsnav")',
            replacement: [
                {
                    match: /switch\((\i)\.type\)\{case \i\.\i\.FOLDER:.+?default:return null\}/,
                    replace: "return $self.wrapGuildNode($1.id,()=>{$&})"
                }
            ]
        }
    ],

    wrapGuildNode(guildId: string, original: () => any) {
        return (
            <ErrorBoundary noop>
                <div className="vc-guild-typing-wrapper">
                    {original()}
                    <GuildTypingIndicator guildId={guildId} />
                </div>
            </ErrorBoundary>
        );
    }
});
