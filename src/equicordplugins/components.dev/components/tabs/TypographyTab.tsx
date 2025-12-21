/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Paragraph } from "@components/Paragraph";

import { SectionWrapper } from "../SectionWrapper";

const TEXT_COLORS = [
    "text-default",
    "text-muted",
    "text-subtle",
    "text-strong",
    "text-normal",
    "text-link",
    "text-brand",
    "text-disabled",
    "text-invert",
    "text-feedback-critical",
    "text-feedback-warning",
    "text-feedback-info",
    "text-feedback-positive",
    "text-status-online",
    "text-status-idle",
    "text-status-dnd",
    "text-status-offline",
    "text-overlay-dark",
    "text-overlay-light",
] as const;

const TEXT_SIZES = [
    { name: "xxs", value: "0.625rem (10px)" },
    { name: "xs", value: "0.75rem (12px)" },
    { name: "sm", value: "0.875rem (14px)" },
    { name: "md", value: "1rem (16px)" },
    { name: "lg", value: "1.25rem (20px)" },
    { name: "xl", value: "1.5rem (24px)" },
    { name: "xxl", value: "2rem (32px)" },
] as const;

const TEXT_WEIGHTS = [
    { name: "thin", value: "100" },
    { name: "extralight", value: "200" },
    { name: "light", value: "300" },
    { name: "normal", value: "400" },
    { name: "medium", value: "500" },
    { name: "semibold", value: "600" },
    { name: "bold", value: "700" },
    { name: "extrabold", value: "800" },
] as const;

const FONT_SIZE_MAP: Record<string, string> = {
    xxs: "0.625rem",
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.25rem",
    xl: "1.5rem",
    xxl: "2rem",
};

export default function TypographyTab() {
    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Text Colors (CSS Variables)">
                <div className="vc-compfinder-grid-vertical">
                    {TEXT_COLORS.map(color => (
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
                    {TEXT_SIZES.map(({ name, value }) => (
                        <div key={name} style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                            <span style={{ fontSize: FONT_SIZE_MAP[name], minWidth: 200 }}>
                                {name}
                            </span>
                            <code style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                {value}
                            </code>
                        </div>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Text Weights">
                <div className="vc-compfinder-grid-vertical">
                    {TEXT_WEIGHTS.map(({ name, value }) => (
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
                    {[
                        "text-code",
                        "text-code-keyword",
                        "text-code-string",
                        "text-code-comment",
                        "text-code-builtin",
                        "text-code-variable",
                        "text-code-tag",
                        "text-code-title",
                        "text-code-section",
                        "text-code-bullet",
                        "text-code-addition",
                        "text-code-deletion",
                    ].map(color => (
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
