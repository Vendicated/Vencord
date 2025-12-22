/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, Notice, NoticeTypes, Paragraph } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function NoticeTab() {
    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Message Types">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Notice component for displaying informational messages with different severity levels.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    {NoticeTypes.map(type => (
                        <div key={type} style={{ textAlign: "center" }}>
                            <Notice messageType={type}>
                                This is a {type} notice message.
                            </Notice>
                            <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                                {type}
                            </Paragraph>
                        </div>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="With Action">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Notices can include action buttons for user interaction.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <Notice
                        messageType="info"
                        action={<Button size="small" variant="secondary">Action</Button>}
                    >
                        Notice with an action button.
                    </Notice>
                    <Notice
                        messageType="warn"
                        action={<Button size="small" variant="primary">Fix Now</Button>}
                    >
                        Warning that requires attention.
                    </Notice>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Hidden State">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    The hidden prop controls visibility without removing from DOM.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <div style={{ textAlign: "center" }}>
                        <Notice messageType="info" hidden={false}>
                            This notice is visible.
                        </Notice>
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                            hidden=false
                        </Paragraph>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <Notice messageType="info" hidden={true}>
                            This notice is hidden.
                        </Notice>
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                            hidden=true
                        </Paragraph>
                    </div>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Text Variants">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Custom text styling via the textVariant prop.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <div style={{ textAlign: "center" }}>
                        <Notice messageType="info">
                            Default text variant.
                        </Notice>
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                            text-sm/medium (default)
                        </Paragraph>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <Notice messageType="info" textVariant="text-md/normal">
                            Larger text variant.
                        </Notice>
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                            text-md/normal
                        </Paragraph>
                    </div>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    • children: ReactNode - Notice content
                </Paragraph>
                <Paragraph color="text-muted">
                    • messageType: "info" | "warn" | "danger" | "positive" | "preview"
                </Paragraph>
                <Paragraph color="text-muted">
                    • action?: ReactNode - Action button or element
                </Paragraph>
                <Paragraph color="text-muted">
                    • hidden?: boolean - Hide the notice
                </Paragraph>
                <Paragraph color="text-muted">
                    • textColor?: string - Custom text color
                </Paragraph>
                <Paragraph color="text-muted">
                    • textVariant?: string - Text size/weight variant
                </Paragraph>
                <Paragraph color="text-muted">
                    • icon?: ComponentType - Custom icon component
                </Paragraph>
                <Paragraph color="text-muted">
                    • className?: string - Additional CSS class
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
