/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Paragraph, Timestamp, TimestampDisplayFormats, TooltipPositions } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function TimestampTab() {
    const now = new Date();

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Timestamp Formats">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    All available timestamp format options using moment.js format strings.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    {TimestampDisplayFormats.map(({ format, description }) => (
                        <div key={format} style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                            <Timestamp timestamp={now} timestampFormat={format} />
                            <Paragraph color="text-muted" style={{ fontSize: 10 }}>
                                {format}: {description}
                            </Paragraph>
                        </div>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Compact Mode">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Compact mode displays a shorter version of the timestamp.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <div style={{ padding: 12 }}>
                        <Timestamp timestamp={now} compact={false} />
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                            compact=false (default)
                        </Paragraph>
                    </div>
                    <div style={{ padding: 12 }}>
                        <Timestamp timestamp={now} compact={true} />
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                            compact=true
                        </Paragraph>
                    </div>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Display Variants">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Different display modes for timestamps.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <div style={{ padding: 12 }}>
                        <Timestamp timestamp={now} isInline={false} />
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                            isInline=false (default)
                        </Paragraph>
                    </div>
                    <div style={{ padding: 12 }}>
                        <Timestamp timestamp={now} isInline={true} />
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                            isInline=true
                        </Paragraph>
                    </div>
                    <div style={{ padding: 12 }}>
                        <Timestamp timestamp={now} cozyAlt={true} />
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                            cozyAlt=true
                        </Paragraph>
                    </div>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Edited Indicator">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Shows an "(edited)" indicator after the timestamp.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <div style={{ padding: 12 }}>
                        <Timestamp timestamp={now} isEdited={false} />
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                            isEdited=false (default)
                        </Paragraph>
                    </div>
                    <div style={{ padding: 12 }}>
                        <Timestamp timestamp={now} isEdited={true} />
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                            isEdited=true
                        </Paragraph>
                    </div>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Visibility on Hover">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Timestamp can be hidden until hovered.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <div style={{ padding: 12 }}>
                        <span style={{ padding: 8, background: "var(--background-secondary)", borderRadius: 4 }}>
                            Hover me: <Timestamp timestamp={now} isVisibleOnlyOnHover={true} />
                        </span>
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                            isVisibleOnlyOnHover=true
                        </Paragraph>
                    </div>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Tooltip Positions">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    The tooltip showing full date can be positioned differently.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    {TooltipPositions.map(position => (
                        <div key={position} style={{ padding: 12 }}>
                            <Timestamp timestamp={now} tooltipPosition={position} />
                            <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                                tooltipPosition="{position}"
                            </Paragraph>
                        </div>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    • timestamp: Date | Moment - The timestamp to display (required)
                </Paragraph>
                <Paragraph color="text-muted">
                    • timestampFormat?: TimestampFormat - Format string (LT, LTS, L, LL, LLL, LLLL, l, ll, lll, llll)
                </Paragraph>
                <Paragraph color="text-muted">
                    • compact?: boolean - Use compact display mode
                </Paragraph>
                <Paragraph color="text-muted">
                    • cozyAlt?: boolean - Use cozy alternative display
                </Paragraph>
                <Paragraph color="text-muted">
                    • isInline?: boolean - Display inline
                </Paragraph>
                <Paragraph color="text-muted">
                    • isVisibleOnlyOnHover?: boolean - Only show on hover
                </Paragraph>
                <Paragraph color="text-muted">
                    • isEdited?: boolean - Show "(edited)" indicator
                </Paragraph>
                <Paragraph color="text-muted">
                    • tooltipPosition?: "top" | "bottom" | "left" | "right" - Tooltip position
                </Paragraph>
                <Paragraph color="text-muted">
                    • id?: string - Element ID
                </Paragraph>
                <Paragraph color="text-muted">
                    • className?: string - Additional CSS class
                </Paragraph>
                <Paragraph color="text-muted">
                    • children?: ReactNode - Custom content
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
