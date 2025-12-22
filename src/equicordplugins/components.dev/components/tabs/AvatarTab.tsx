/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Avatar, AvatarSizes, Paragraph, UserStore } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function AvatarTab() {
    const currentUser = UserStore.getCurrentUser();
    const avatarUrl = currentUser?.getAvatarURL?.(undefined, 128);

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Avatar Sizes">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Avatar component from @webpack/common with various sizes.
                </Paragraph>
                <div className="vc-compfinder-grid" style={{ alignItems: "flex-end" }}>
                    {AvatarSizes.map(size => (
                        <div key={size} style={{ textAlign: "center" }}>
                            <Avatar
                                src={avatarUrl}
                                size={size}
                            />
                            <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                                {size.replace("SIZE_", "")}
                            </Paragraph>
                        </div>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="With Status">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Avatar with status indicator.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <div style={{ textAlign: "center" }}>
                        <Avatar
                            src={avatarUrl}
                            size="SIZE_40"
                            status="online"
                        />
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>Online</Paragraph>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <Avatar
                            src={avatarUrl}
                            size="SIZE_40"
                            status="idle"
                        />
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>Idle</Paragraph>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <Avatar
                            src={avatarUrl}
                            size="SIZE_40"
                            status="dnd"
                        />
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>DND</Paragraph>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <Avatar
                            src={avatarUrl}
                            size="SIZE_40"
                            status="offline"
                        />
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>Offline</Paragraph>
                    </div>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Mobile Status">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Avatar with mobile indicator.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <Avatar
                        src={avatarUrl}
                        size="SIZE_40"
                        status="online"
                        isMobile
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Speaking State">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Avatar with speaking ring indicator.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <div style={{ textAlign: "center" }}>
                        <Avatar
                            src={avatarUrl}
                            size="SIZE_40"
                            isSpeaking
                        />
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>Speaking</Paragraph>
                    </div>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">• src - Avatar image URL</Paragraph>
                <Paragraph color="text-muted">• size - SIZE_16, SIZE_20, SIZE_24, SIZE_32, SIZE_40, SIZE_44, SIZE_48, SIZE_56, SIZE_72, SIZE_80, SIZE_96, SIZE_120, SIZE_152</Paragraph>
                <Paragraph color="text-muted">• status - online, idle, dnd, offline</Paragraph>
                <Paragraph color="text-muted">• isMobile - Show mobile indicator</Paragraph>
                <Paragraph color="text-muted">• isTyping - Show typing indicator</Paragraph>
                <Paragraph color="text-muted">• isSpeaking - Show speaking ring</Paragraph>
                <Paragraph color="text-muted">• statusTooltip - Show status on hover</Paragraph>
                <Paragraph color="text-muted">• aria-label - Accessibility label</Paragraph>
            </SectionWrapper>
        </div>
    );
}
