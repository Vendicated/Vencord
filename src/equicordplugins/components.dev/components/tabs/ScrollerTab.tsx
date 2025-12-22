/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaButton, Paragraph, ScrollerAuto, ScrollerNone, ScrollerThin, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

const SAMPLE_ITEMS = Array.from({ length: 20 }, (_, i) => `Item ${i + 1}`);

export default function ScrollerTab() {
    const [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical");
    const [fade, setFade] = useState(true);

    const scrollerStyle = orientation === "vertical"
        ? { height: 200, width: "100%", border: "1px solid var(--background-modifier-accent)", borderRadius: 8 }
        : { height: 60, width: "100%", border: "1px solid var(--background-modifier-accent)", borderRadius: 8 };

    const itemStyle = orientation === "vertical"
        ? { padding: "8px 12px", borderBottom: "1px solid var(--background-modifier-accent)" }
        : { padding: "8px 16px", display: "inline-block", whiteSpace: "nowrap" as const };

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Controls">
                <div className="vc-compfinder-grid">
                    <ManaButton
                        variant="secondary"
                        text={`Orientation: ${orientation}`}
                        onClick={() => setOrientation(o => o === "vertical" ? "horizontal" : "vertical")}
                    />
                    <ManaButton
                        variant="secondary"
                        text={`Fade: ${fade}`}
                        onClick={() => setFade(f => !f)}
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="ScrollerThin">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Thin scrollbar, most commonly used. Ideal for sidebars and lists.
                </Paragraph>
                <ScrollerThin orientation={orientation} fade={fade} style={scrollerStyle}>
                    {SAMPLE_ITEMS.map(item => (
                        <div key={item} style={itemStyle}>
                            <Paragraph>{item}</Paragraph>
                        </div>
                    ))}
                </ScrollerThin>
            </SectionWrapper>

            <SectionWrapper title="ScrollerAuto">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Standard scrollbar that appears automatically when content overflows.
                </Paragraph>
                <ScrollerAuto orientation={orientation} fade={fade} style={scrollerStyle}>
                    {SAMPLE_ITEMS.map(item => (
                        <div key={item} style={itemStyle}>
                            <Paragraph>{item}</Paragraph>
                        </div>
                    ))}
                </ScrollerAuto>
            </SectionWrapper>

            <SectionWrapper title="ScrollerNone">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    No visible scrollbar, content still scrollable via mouse wheel/touch.
                </Paragraph>
                <ScrollerNone orientation={orientation} fade={fade} style={scrollerStyle}>
                    {SAMPLE_ITEMS.map(item => (
                        <div key={item} style={itemStyle}>
                            <Paragraph>{item}</Paragraph>
                        </div>
                    ))}
                </ScrollerNone>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">• orientation - "vertical" | "horizontal" (default: "vertical")</Paragraph>
                <Paragraph color="text-muted">• fade - boolean, adds fade effect at edges</Paragraph>
                <Paragraph color="text-muted">• className - custom CSS class</Paragraph>
                <Paragraph color="text-muted">• style - inline styles</Paragraph>
                <Paragraph color="text-muted">• children - content to scroll</Paragraph>
                <Paragraph color="text-muted">• dir - text direction ("ltr" | "rtl")</Paragraph>
            </SectionWrapper>

            <SectionWrapper title="Variants">
                <Paragraph color="text-muted">• ScrollerThin - Thin scrollbar (most common)</Paragraph>
                <Paragraph color="text-muted">• ScrollerAuto - Standard auto-showing scrollbar</Paragraph>
                <Paragraph color="text-muted">• ScrollerNone - Hidden scrollbar</Paragraph>
                <Paragraph color="text-muted">• ListScrollerThin - Virtualized list with thin scrollbar</Paragraph>
                <Paragraph color="text-muted">• ListScrollerAuto - Virtualized list with auto scrollbar</Paragraph>
                <Paragraph color="text-muted">• ListScrollerNone - Virtualized list with hidden scrollbar</Paragraph>
            </SectionWrapper>

            <SectionWrapper title="Import">
                <Paragraph color="text-muted">
                    {"import { ScrollerThin, ScrollerAuto, ScrollerNone } from \"@webpack/common\";"}
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
