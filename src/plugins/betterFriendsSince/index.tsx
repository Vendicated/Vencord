/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { openUserProfile } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "@vencord/discord-types";
import { findByCodeLazy, findByPropsLazy, findCssClassesLazy } from "@webpack";
import { Avatar, Clickable, IconUtils, RelationshipStore, RestAPI, ScrollerThin, Text, useEffect, UserStore, useState } from "@webpack/common";

const logger = new Logger("MutualFriendsSince");

const settings = definePluginSettings({
    showInProfiles: {
        type: OptionType.BOOLEAN,
        description: "Show \"Friends since\" dates in a profile's Mutual Friends tab",
        default: true,
        restartNeeded: true
    },
    showInFriendsList: {
        type: OptionType.BOOLEAN,
        description: "Show \"Friends since\" dates in your Friends list (Online / All tabs)",
        default: true,
        restartNeeded: true
    }
});

const getFormattedDate = findByCodeLazy('month:"short",day:"numeric"');
const LocaleStore = findByPropsLazy("getLocale");
const ProfileListClasses = findCssClassesLazy("empty", "textContainer", "connectionIcon");
const TabPanelClasses = findCssClassesLazy("tabPanelScroller", "tabBarPanel");
const MutualRowClasses = findCssClassesLazy("row", "icon", "name", "details");

interface MutualFriend {
    id: string;
    username: string;
    global_name?: string | null;
    avatar?: string | null;
    discriminator?: string;
}

async function fetchMutualFriends(userId: string): Promise<MutualFriend[]> {
    const { body } = await RestAPI.get({ url: `/users/${userId}/relationships` });
    return body;
}

function getFriendsSinceLabel(userId: string): string | null {
    try {
        if (!RelationshipStore.isFriend(userId)) return null;
        const since = RelationshipStore.getSince(userId);
        if (!since) return null;
        return getFormattedDate(since, LocaleStore.getLocale());
    } catch (e) {
        logger.error("Failed to read friends-since date for", userId, e);
        return null;
    }
}

export default definePlugin({
    name: "BetterFriendsSince",
    description: "Shows how long you have been friends with a user in another user's 'Mutual Friends' tab",
    authors: [Devs["0bi0"]],
    settings,

    patches: [
        {
            find: ".WIDGETS?",
            replacement: {
                predicate: () => settings.store.showInProfiles,
                match: /(?<=\i===\i\.\i\.MUTUAL_FRIENDS\?\(0,\i\.jsx\)\()\i(?=,\{user:\i,guildId:\i,channelId:\i,onClose:\i\}\))/,
                replace: "$self.renderMutualFriends"
            }
        }
    ],

    renderMutualFriends: ErrorBoundary.wrap(({ user, onClose }: { user: User; onClose: () => void; }) => {
        const [friends, setFriends] = useState<MutualFriend[] | null>(null);
        const [errored, setErrored] = useState(false);

        useEffect(() => {
            let cancelled = false;
            setFriends(null);
            setErrored(false);

            fetchMutualFriends(user.id)
                .then(list => !cancelled && setFriends(list))
                .catch(e => {
                    logger.error("Failed to fetch mutual friends for", user.id, e);
                    if (!cancelled) setErrored(true);
                });

            return () => { cancelled = true; };
        }, [user.id]);

        if (errored) {
            return (
                <div className={ProfileListClasses.empty}>
                    <div className={ProfileListClasses.textContainer}>
                        <Text variant="text-md/semibold">Couldn't load mutual friends</Text>
                    </div>
                </div>
            );
        }

        if (friends === null) return null;

        if (friends.length === 0) {
            return (
                <div className={ProfileListClasses.empty}>
                    <div className={ProfileListClasses.textContainer}>
                        <Text variant="text-md/semibold">You don't have any friends in common</Text>
                    </div>
                </div>
            );
        }

        return (
            <ScrollerThin className={TabPanelClasses.tabPanelScroller} fade={true} onClose={onClose}>
                {friends.map(friend => {
                    const displayUser = UserStore.getUser(friend.id) ?? friend;
                    const since = getFriendsSinceLabel(friend.id);

                    return (
                        <Clickable
                            key={friend.id}
                            className={MutualRowClasses.row}
                            onClick={() => {
                                onClose();
                                openUserProfile(friend.id);
                            }}
                        >
                            <Avatar
                                src={IconUtils.getUserAvatarURL(displayUser, true)}
                                size="SIZE_40"
                                className={MutualRowClasses.icon}
                            />
                            <div className={MutualRowClasses.details}>
                                <div className={MutualRowClasses.name}>
                                    {friend.global_name || friend.username}
                                </div>
                                {since && (
                                    <Text variant="text-xs/medium">
                                        Friends since {since}
                                    </Text>
                                )}
                            </div>
                        </Clickable>
                    );
                })}
            </ScrollerThin>
        );
    }, { noop: true }),
});