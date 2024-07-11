/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import definePlugin from "@utils/types";
import { findByCodeLazy, findByPropsLazy, findLazy } from "@webpack";
import { Heading, i18n, RelationshipStore, Text } from "@webpack/common";

const containerWrapper: Record<string, string> = findByPropsLazy("memberSinceWrapper");
const container: Record<string, string> = findByPropsLazy("memberSince");
const getCreatedAtDate = findByCodeLazy('month:"short",day:"numeric"');
const lastSection: Record<string, string> = findByPropsLazy("lastSection");
const section: Record<string, string> = findLazy((m: any) =>
    m.section !== undefined
    && m.heading !== undefined
    && Object.values(m).length === 2
);

export default definePlugin({
    name: "FriendsSince",
    description: "Shows when you became friends with someone in the user popout",
    authors: [Devs.Elvyra, Devs.Antti],
    patches: [
        // User popup - old layout
        {
            find: ".USER_PROFILE}};return",
            replacement: {
                match: /,{userId:(\i.id).{0,30}}\)/,
                replace: "$&,$self.friendsSinceOld({ userId: $1 })"
            }
        },
        // DM User Sidebar - old layout
        {
            find: ".PROFILE_PANEL,",
            replacement: {
                match: /,{userId:([^,]+?)}\)/,
                replace: "$&,$self.friendsSinceOld({ userId: $1 })"
            }
        },
        // User Profile Modal - old layout
        {
            find: ".userInfoSectionHeader,",
            replacement: {
                match: /(\.Messages\.USER_PROFILE_MEMBER_SINCE.+?userId:(.+?),textClassName:)(\i\.userInfoText)}\)/,
                replace: (_, rest, userId, textClassName) => `${rest}!$self.getFriendSince(${userId}) ? ${textClassName} : void 0 }), $self.friendsSinceOld({ userId: ${userId}, textClassName: ${textClassName} })`
            }
        },
        // DM User Sidebar - new layout
        {
            find: ".PANEL}),nicknameIcons",
            replacement: {
                match: /USER_PROFILE_MEMBER_SINCE,.{0,100}userId:(\i\.id)}\)}\)/,
                replace: "$&,$self.friendsSinceNew({userId:$1,isSidebar:true})"
            }
        },
        // User Profile Modal - new layout
        {
            find: "action:\"PRESS_APP_CONNECTION\"",
            replacement: {
                match: /USER_PROFILE_MEMBER_SINCE,.{0,100}userId:(\i\.id),.{0,100}}\)}\),/,
                replace: "$&,$self.friendsSinceNew({userId:$1,isSidebar:false}),"
            }
        }
    ],

    getFriendSince: (userId: string) => RelationshipStore.isFriend(userId)
        ? RelationshipStore.getSince(userId)
        : null,

    friendsSinceOld: ErrorBoundary.wrap(({ userId, textClassName }: { userId: string; textClassName?: string; }) => {
        if (!RelationshipStore.isFriend(userId)) return null;

        const friendsSince = RelationshipStore.getSince(userId);
        if (!friendsSince) return null;

        return (
            <div className={lastSection.section}>
                <Heading variant="eyebrow">
                    Friends Since
                </Heading>

                <div className={containerWrapper.memberSinceWrapper}>
                    {!!getCurrentChannel()?.guild_id && (
                        <svg
                            aria-hidden="true"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="var(--interactive-normal)"
                        >
                            <path d="M13 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                            <path d="M3 5v-.75C3 3.56 3.56 3 4.25 3s1.24.56 1.33 1.25C6.12 8.65 9.46 12 13 12h1a8 8 0 0 1 8 8 2 2 0 0 1-2 2 .21.21 0 0 1-.2-.15 7.65 7.65 0 0 0-1.32-2.3c-.15-.2-.42-.06-.39.17l.25 2c.02.15-.1.28-.25.28H9a2 2 0 0 1-2-2v-2.22c0-1.57-.67-3.05-1.53-4.37A15.85 15.85 0 0 1 3 5Z" />
                        </svg>
                    )}
                    <Text variant="text-sm/normal" className={textClassName}>
                        {getCreatedAtDate(friendsSince, i18n.getLocale())}
                    </Text>
                </div>
            </div>
        );
    }, { noop: true }),

    friendsSinceNew: ErrorBoundary.wrap(({ userId, isSidebar }: { userId: string; isSidebar: boolean; }) => {
        if (!RelationshipStore.isFriend(userId)) return null;

        const friendsSince = RelationshipStore.getSince(userId);
        if (!friendsSince) return null;

        return (
            <section className={section.section}>
                <Heading variant="text-xs/semibold" style={isSidebar ? {} : { color: "var(--header-secondary)" }}>
                    Friends Since
                </Heading>

                {
                    isSidebar ? (
                        <Text variant="text-sm/normal">
                            {getCreatedAtDate(friendsSince, i18n.getLocale())}
                        </Text>
                    ) : (
                        <div className={containerWrapper.memberSinceWrapper}>
                            <div className={container.memberSince}>
                                {!!getCurrentChannel()?.guild_id && (
                                    <svg
                                        aria-hidden="true"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="var(--interactive-normal)"
                                    >
                                        <path d="M13 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM3 5v-.75C3 3.56 3.56 3 4.25 3s1.24.56 1.33 1.25C6.12 8.65 9.46 12 13 12h1a8 8 0 0 1 8 8 2 2 0 0 1-2 2 .21.21 0 0 1-.2-.15 7.65 7.65 0 0 0-1.32-2.3c-.15-.2-.42-.06-.39.17l.25 2c.02.15-.1.28-.25.28H9a2 2 0 0 1-2-2v-2.22c0-1.57-.67-3.05-1.53-4.37A15.85 15.85 0 0 1 3 5Z" />
                                    </svg>
                                )}
                                <Text variant="text-sm/normal">
                                    {getCreatedAtDate(friendsSince, i18n.getLocale())}
                                </Text>
                            </div>
                        </div>
                    )
                }

            </section>
        );
    }, { noop: true }),
});
