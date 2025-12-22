/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CodeColors, FontSizeMap, Paragraph, TextColors, TextSizes, TextWeights } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function TypographyTab() {
    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Text Colors (CSS Variables)">
                <div className="vc-compfinder-grid-vertical">
                    {TextColors.map(color => (
                        <div key={color} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <span style={{ color: `var(--${color})`, minWidth: 200 }}>
                                {color}
                            </span>
                            <code style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                var(--{color})
                            </code>
                        </div>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Text Sizes">
                <div className="vc-compfinder-grid-vertical">
                    {TextSizes.map(({ name, value, pixels }) => (
                        <div key={name} style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                            <span style={{ fontSize: FontSizeMap[name], minWidth: 200 }}>
                                {name}
                            </span>
                            <code style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                {value} ({pixels})
                            </code>
                        </div>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Text Weights">
                <div className="vc-compfinder-grid-vertical">
                    {TextWeights.map(({ name, value }) => (
                        <div key={name} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <span style={{ fontWeight: value, minWidth: 200 }}>
                                {name}
                            </span>
                            <code style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                font-weight: {value}
                            </code>
                        </div>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Usage with BaseText">
                <div className="vc-compfinder-grid-vertical" style={{ gap: 4 }}>
                    <code style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        {"import { BaseText } from \"@components/BaseText\";"}
                    </code>
                    <code style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        {"<BaseText size=\"md\" weight=\"semibold\" color=\"text-default\">Text</BaseText>"}
                    </code>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Code Colors">
                <div className="vc-compfinder-grid-vertical">
                    {CodeColors.map(color => (
                        <div key={color} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <span style={{ color: `var(--${color})`, minWidth: 200, fontFamily: "monospace" }}>
                                {color}
                            </span>
                            <code style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                var(--{color})
                            </code>
                        </div>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    <strong>BaseText</strong> - from @components/BaseText
                </Paragraph>
                <Paragraph color="text-muted">
                    • size?: "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl"
                </Paragraph>
                <Paragraph color="text-muted">
                    • weight?: "thin" | "extralight" | "light" | "normal" | "medium" | "semibold" | "bold" | "extrabold"
                </Paragraph>
                <Paragraph color="text-muted">
                    • color?: string - CSS variable name (e.g., "text-muted")
                </Paragraph>
                <Paragraph color="text-muted">
                    • tag?: "span" | "p" | "div" | "h1" - etc.
                </Paragraph>
                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>Heading</strong> - from @components/Heading
                </Paragraph>
                <Paragraph color="text-muted">
                    • tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" (default: h5)
                </Paragraph>
                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>Paragraph</strong> - from @components/Paragraph
                </Paragraph>
                <Paragraph color="text-muted">
                    • color?: string - CSS variable name
                </Paragraph>
                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>Span</strong> - from @components/Span
                </Paragraph>
                <Paragraph color="text-muted">
                    • Inline text with default styling
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
