/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Paragraph, UserStore, UserSummaryItem } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function UserSummaryItemTab() {
    const currentUser = UserStore.getCurrentUser();
    const users = currentUser ? [currentUser, currentUser, currentUser, currentUser, currentUser] : [];

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Basic UserSummaryItem">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Displays a row of user avatars with overflow indicator.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <UserSummaryItem users={users} max={3} />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Different Sizes">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Available sizes: 16, 24, 32, 56.
                </Paragraph>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <Paragraph color="text-muted" style={{ width: 50 }}>16:</Paragraph>
                        <UserSummaryItem users={users} max={4} size={16} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <Paragraph color="text-muted" style={{ width: 50 }}>24:</Paragraph>
                        <UserSummaryItem users={users} max={4} size={24} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <Paragraph color="text-muted" style={{ width: 50 }}>32:</Paragraph>
                        <UserSummaryItem users={users} max={4} size={32} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <Paragraph color="text-muted" style={{ width: 50 }}>56:</Paragraph>
                        <UserSummaryItem users={users} max={4} size={56} />
                    </div>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Max Users">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Control how many avatars to show before overflow.
                </Paragraph>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <Paragraph color="text-muted" style={{ width: 80 }}>max=2:</Paragraph>
                        <UserSummaryItem users={users} max={2} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <Paragraph color="text-muted" style={{ width: 80 }}>max=3:</Paragraph>
                        <UserSummaryItem users={users} max={3} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <Paragraph color="text-muted" style={{ width: 80 }}>max=5:</Paragraph>
                        <UserSummaryItem users={users} max={5} />
                    </div>
                </div>
            </SectionWrapper>

            <SectionWrapper title="With Popout">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Enable user popout on avatar click.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <UserSummaryItem users={users} max={3} showUserPopout />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">• users - Array of User objects (or null for empty slots)</Paragraph>
                <Paragraph color="text-muted">• max - Maximum avatars to show (default 10)</Paragraph>
                <Paragraph color="text-muted">• count - Override count for "+N" display</Paragraph>
                <Paragraph color="text-muted">• size - 16, 24, 32, or 56 (default 24)</Paragraph>
                <Paragraph color="text-muted">• guildId - Guild context for avatars</Paragraph>
                <Paragraph color="text-muted">• showUserPopout - Enable user popout on click</Paragraph>
                <Paragraph color="text-muted">• showDefaultAvatarsForNullUsers - Show default avatar for null</Paragraph>
                <Paragraph color="text-muted">• renderUser - Custom render function for each user</Paragraph>
                <Paragraph color="text-muted">• renderMoreUsers - Custom render for overflow indicator</Paragraph>
                <Paragraph color="text-muted">• hideMoreUsers - Hide the "+N" overflow count</Paragraph>
            </SectionWrapper>
        </div>
    );
}
