/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Anchor , Paragraph } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function AnchorTab() {
    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Basic Anchor">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    A styled anchor/link component with underline on hover.
                </Paragraph>
                <Anchor href="https://discord.com">
                    Discord Homepage
                </Anchor>
            </SectionWrapper>

            <SectionWrapper title="Without Underline Styles">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Disable the default underline-on-hover behavior.
                </Paragraph>
                <Anchor href="https://discord.com" useDefaultUnderlineStyles={false}>
                    No underline on hover
                </Anchor>
            </SectionWrapper>

            <SectionWrapper title="With Custom Target">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Open in same tab instead of new tab.
                </Paragraph>
                <Anchor href="https://discord.com" target="_self">
                    Opens in same tab
                </Anchor>
            </SectionWrapper>

            <SectionWrapper title="With Title Tooltip">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Hover to see the title tooltip.
                </Paragraph>
                <Anchor href="https://discord.com" title="Click to visit Discord">
                    Hover for tooltip
                </Anchor>
            </SectionWrapper>

            <SectionWrapper title="With Custom Styling">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Custom styles applied via style prop.
                </Paragraph>
                <Anchor
                    href="https://discord.com"
                    style={{ color: "var(--text-positive)", fontWeight: 600 }}
                >
                    Green styled link
                </Anchor>
            </SectionWrapper>

            <SectionWrapper title="With onClick Handler">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Custom click handler (prevents default navigation).
                </Paragraph>
                <Anchor
                    href="#"
                    onClick={e => {
                        e.preventDefault();
                        alert("Link clicked!");
                    }}
                >
                    Click me (shows alert)
                </Anchor>
            </SectionWrapper>

            <SectionWrapper title="Multiple Links">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Links in a sentence.
                </Paragraph>
                <Paragraph>
                    Check out the <Anchor href="https://discord.com/terms">Terms of Service</Anchor> and{" "}
                    <Anchor href="https://discord.com/privacy">Privacy Policy</Anchor> for more info.
                </Paragraph>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    <strong>Anchor</strong> - Styled link component (also known as MaskedLink)
                </Paragraph>
                <Paragraph color="text-muted">• href?: string - Link URL</Paragraph>
                <Paragraph color="text-muted">• onClick?: MouseEventHandler - Click handler</Paragraph>
                <Paragraph color="text-muted">• className?: string - Additional CSS classes</Paragraph>
                <Paragraph color="text-muted">• children?: ReactNode - Link content</Paragraph>
                <Paragraph color="text-muted">• rel?: string - Link relationship (auto-set for external)</Paragraph>
                <Paragraph color="text-muted">• target?: string - Link target (auto-set to _blank for external)</Paragraph>
                <Paragraph color="text-muted">• useDefaultUnderlineStyles?: boolean - Show underline on hover (default: true)</Paragraph>
                <Paragraph color="text-muted">• title?: string - Tooltip text on hover</Paragraph>
                <Paragraph color="text-muted">• style?: CSSProperties - Inline styles</Paragraph>
                <Paragraph color="text-muted">• focusProps?: object - Focus ring configuration</Paragraph>
                <Paragraph color="text-muted">• ref?: Ref - Forward ref to anchor element</Paragraph>
                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>Behavior</strong>
                </Paragraph>
                <Paragraph color="text-muted">• External links automatically get rel="noreferrer noopener" and target="_blank"</Paragraph>
                <Paragraph color="text-muted">• If no onClick is provided but href is set, uses Discord's default link interceptor</Paragraph>
                <Paragraph color="text-muted">• Untrusted external links show a warning modal before navigating</Paragraph>
            </SectionWrapper>
        </div>
    );
}
