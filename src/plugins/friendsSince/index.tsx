/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Heading, React, RelationshipStore, Text } from "@webpack/common";

const container = findByPropsLazy("memberSinceWrapper");
const { getCreatedAtDate } = findByPropsLazy("getCreatedAtDate");
const clydeMoreInfo = findByPropsLazy("clydeMoreInfo");
const locale = findByPropsLazy("getLocale");
const lastSection = findByPropsLazy("lastSection");

export default definePlugin({
    name: "FriendsSince",
    description: "Shows when you became friends with someone in the user popout",
    authors: [Devs.Elvyra],
    patches: [
        {
            find: ".AnalyticsSections.USER_PROFILE}",
            replacement: {
                match: /\i.default,\{userId:(\i.id).{0,30}}\)/,
                replace: "$&,$self.friendsSince({ userId: $1 })"
            }
        },
        {
            find: ".UserPopoutUpsellSource.PROFILE_PANEL,",
            replacement: {
                match: /\i.default,\{userId:(\i)}\)/,
                replace: "$&,$self.friendsSince({ userId: $1 })"
            }
        }
    ],

    friendsSince: ErrorBoundary.wrap(({ userId }: { userId: string; }) => {
        const friendsSince = RelationshipStore.getSince(userId);
        if (!friendsSince) return null;

        return (
            <div className={lastSection.section}>
                <Heading variant="eyebrow" className={clydeMoreInfo.title}>
                    Friends Since
                </Heading>

                <div className={container.memberSinceWrapper}>
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
                    <Text variant="text-sm/normal" className={clydeMoreInfo.body}>
                        {getCreatedAtDate(friendsSince, locale.getLocale())}
                    </Text>
                </div>
            </div>
        );
    }, { noop: true })
});

