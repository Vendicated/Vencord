/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaButton, ManaRichTooltip , Paragraph } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function RichTooltipTab() {
    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Rich Tooltip - Basic">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Rich tooltip with title and body text.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <ManaRichTooltip
                        title="Tooltip Title"
                        body="This is the body text of the rich tooltip with more detailed information."
                        asContainer
                    >
                        <ManaButton variant="secondary" text="Hover me" />
                    </ManaRichTooltip>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Rich Tooltip - Body Only">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Rich tooltip without title.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <ManaRichTooltip
                        body="This tooltip only has body text, no title."
                        asContainer
                    >
                        <ManaButton variant="secondary" text="Body Only" />
                    </ManaRichTooltip>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Positions">
                <div className="vc-compfinder-grid">
                    <ManaRichTooltip
                        title="Top"
                        body="Positioned at top"
                        position="top"
                        asContainer
                    >
                        <ManaButton variant="secondary" text="Top" />
                    </ManaRichTooltip>
                    <ManaRichTooltip
                        title="Bottom"
                        body="Positioned at bottom"
                        position="bottom"
                        asContainer
                    >
                        <ManaButton variant="secondary" text="Bottom" />
                    </ManaRichTooltip>
                    <ManaRichTooltip
                        title="Left"
                        body="Positioned at left"
                        position="left"
                        asContainer
                    >
                        <ManaButton variant="secondary" text="Left" />
                    </ManaRichTooltip>
                    <ManaRichTooltip
                        title="Right"
                        body="Positioned at right"
                        position="right"
                        asContainer
                    >
                        <ManaButton variant="secondary" text="Right" />
                    </ManaRichTooltip>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Alignment">
                <div className="vc-compfinder-grid">
                    <ManaRichTooltip
                        title="Start Aligned"
                        body="Tooltip aligned to start"
                        align="start"
                        asContainer
                    >
                        <ManaButton variant="secondary" text="Start" />
                    </ManaRichTooltip>
                    <ManaRichTooltip
                        title="Center Aligned"
                        body="Tooltip aligned to center"
                        align="center"
                        asContainer
                    >
                        <ManaButton variant="secondary" text="Center" />
                    </ManaRichTooltip>
                    <ManaRichTooltip
                        title="End Aligned"
                        body="Tooltip aligned to end"
                        align="end"
                        asContainer
                    >
                        <ManaButton variant="secondary" text="End" />
                    </ManaRichTooltip>
                </div>
            </SectionWrapper>

            <SectionWrapper title="With Custom Spacing">
                <div className="vc-compfinder-grid">
                    <ManaRichTooltip
                        title="More Spacing"
                        body="This tooltip has increased spacing from the target element."
                        spacing={16}
                        asContainer
                    >
                        <ManaButton variant="secondary" text="16px Spacing" />
                    </ManaRichTooltip>
                    <ManaRichTooltip
                        title="Less Spacing"
                        body="This tooltip has minimal spacing."
                        spacing={4}
                        asContainer
                    >
                        <ManaButton variant="secondary" text="4px Spacing" />
                    </ManaRichTooltip>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Container Element Types">
                <div className="vc-compfinder-grid">
                    <ManaRichTooltip
                        title="Span Container"
                        body="Uses span as container element (default)"
                        element="span"
                        asContainer
                    >
                        <ManaButton variant="secondary" text="Span" />
                    </ManaRichTooltip>
                    <ManaRichTooltip
                        title="Div Container"
                        body="Uses div as container element"
                        element="div"
                        asContainer
                    >
                        <ManaButton variant="secondary" text="Div" />
                    </ManaRichTooltip>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    • title?: string - Tooltip title (bold)
                </Paragraph>
                <Paragraph color="text-muted">
                    • body?: string - Tooltip body text
                </Paragraph>
                <Paragraph color="text-muted">
                    • children: ReactNode - Trigger element
                </Paragraph>
                <Paragraph color="text-muted">
                    • position?: "top" | "bottom" | "left" | "right" - Position
                </Paragraph>
                <Paragraph color="text-muted">
                    • align?: "start" | "center" | "end" - Alignment
                </Paragraph>
                <Paragraph color="text-muted">
                    • spacing?: number - Distance from trigger (px)
                </Paragraph>
                <Paragraph color="text-muted">
                    • asContainer?: boolean - Wrap children in container
                </Paragraph>
                <Paragraph color="text-muted">
                    • element?: "span" | "div" - Container element type
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
