/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import definePlugin from "@utils/types";
import { findByCodeLazy, findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { RelationshipStore, Text } from "@webpack/common";

const containerWrapper = findByPropsLazy("memberSinceWrapper");
const container = findByPropsLazy("memberSince");
const getCreatedAtDate = findByCodeLazy('month:"short",day:"numeric"');
const locale = findByPropsLazy("getLocale");
const Section = findComponentByCodeLazy('"auto":"smooth"', ".section");

export default definePlugin({
    name: "FriendsSince",
    description: "Shows when you became friends with someone in the user popout",
    authors: [Devs.Elvyra, Devs.Antti],
    patches: [
        // DM User Sidebar
        {
            find: ".PANEL}),nicknameIcons",
            replacement: {
                match: /USER_PROFILE_MEMBER_SINCE,.{0,100}userId:(\i\.id)}\)}\)/,
                replace: "$&,$self.FriendsSinceComponent({userId:$1,isSidebar:true})"
            }
        },
        // User Profile Modal
        {
            find: "action:\"PRESS_APP_CONNECTION\"",
            replacement: {
                match: /USER_PROFILE_MEMBER_SINCE,.{0,100}userId:(\i\.id),.{0,100}}\)}\),/,
                replace: "$&,$self.FriendsSinceComponent({userId:$1,isSidebar:false}),"
            }
        }
    ],

    FriendsSinceComponent: ErrorBoundary.wrap(({ userId, isSidebar }: { userId: string; isSidebar: boolean; }) => {
        if (!RelationshipStore.isFriend(userId)) return null;

        const friendsSince = RelationshipStore.getSince(userId);
        if (!friendsSince) return null;

        return (
            <Section heading="Friends Since">
                {
                    isSidebar ? (
                        <Text variant="text-sm/normal">
                            {getCreatedAtDate(friendsSince, locale.getLocale())}
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
                                        <path d="M13 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                                        <path d="M3 5v-.75C3 3.56 3.56 3 4.25 3s1.24.56 1.33 1.25C6.12 8.65 9.46 12 13 12h1a8 8 0 0 1 8 8 2 2 0 0 1-2 2 .21.21 0 0 1-.2-.15 7.65 7.65 0 0 0-1.32-2.3c-.15-.2-.42-.06-.39.17l.25 2c.02.15-.1.28-.25.28H9a2 2 0 0 1-2-2v-2.22c0-1.57-.67-3.05-1.53-4.37A15.85 15.85 0 0 1 3 5Z" />
                                    </svg>
                                )}
                                <Text variant="text-sm/normal">
                                    {getCreatedAtDate(friendsSince, locale.getLocale())}
                                </Text>
                            </div>
                        </div>
                    )
                }
            </Section>
        );
    }, { noop: true }),
});
