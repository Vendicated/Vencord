/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Divider, Paragraph } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function DividerTab() {
    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Vencord Divider">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Simple horizontal rule from @components/Divider.
                </Paragraph>
                <div style={{ padding: "16px 0" }}>
                    <Paragraph>Content above divider</Paragraph>
                    <Divider />
                    <Paragraph>Content below divider</Paragraph>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Custom Styled Dividers">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Dividers with custom margins and styles.
                </Paragraph>
                <div style={{ padding: "16px 0" }}>
                    <Paragraph>Tight spacing (8px)</Paragraph>
                    <Divider style={{ margin: "8px 0" }} />
                    <Paragraph>Medium spacing (16px)</Paragraph>
                    <Divider style={{ margin: "16px 0" }} />
                    <Paragraph>Large spacing (24px)</Paragraph>
                    <Divider style={{ margin: "24px 0" }} />
                    <Paragraph>End</Paragraph>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">• className - Custom CSS class</Paragraph>
                <Paragraph color="text-muted">• style - Inline styles</Paragraph>
                <Paragraph color="text-muted">• ...restProps - Any other hr attributes</Paragraph>
            </SectionWrapper>

            <SectionWrapper title="Import">
                <Paragraph color="text-muted">
                    {"import { Divider } from \"@components/Divider\";"}
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
