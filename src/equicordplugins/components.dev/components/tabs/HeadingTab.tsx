/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DiscordHeading, DiscordText, HeadingVariants, Paragraph,TextColors, TextVariants } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function HeadingTab() {
    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Discord Heading">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Discord's Heading component with variant prop. Auto-sets h1-h6 tag based on nesting level.
                </Paragraph>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {HeadingVariants.slice(0, 10).map(variant => (
                        <DiscordHeading key={variant} variant={variant}>
                            {variant}
                        </DiscordHeading>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="More Heading Sizes">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {HeadingVariants.slice(10).map(variant => (
                        <DiscordHeading key={variant} variant={variant}>
                            {variant}
                        </DiscordHeading>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Discord Text">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Discord's Text component for body text with various sizes and weights.
                </Paragraph>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {TextVariants.slice(0, 12).map(variant => (
                        <DiscordText key={variant} variant={variant}>
                            {variant}
                        </DiscordText>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Smaller Text Sizes">
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {TextVariants.slice(12).map(variant => (
                        <DiscordText key={variant} variant={variant}>
                            {variant}
                        </DiscordText>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Text Colors">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Available color props for Text component.
                </Paragraph>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {TextColors.map(color => (
                        <DiscordText key={color} variant="text-md/medium" color={color}>
                            {color}
                        </DiscordText>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props - DiscordHeading">
                <Paragraph color="text-muted">• variant - "heading-SIZE/WEIGHT" (xxl, xl, lg, md, sm)</Paragraph>
                <Paragraph color="text-muted">• className - Custom CSS class</Paragraph>
                <Paragraph color="text-muted">• color - Text color (same as Text colors)</Paragraph>
            </SectionWrapper>

            <SectionWrapper title="Props - DiscordText">
                <Paragraph color="text-muted">• variant - "text-SIZE/WEIGHT" (xxl, xl, lg, md, sm, xs)</Paragraph>
                <Paragraph color="text-muted">• color - Text color name</Paragraph>
                <Paragraph color="text-muted">• tag - HTML tag to render (default: "div")</Paragraph>
                <Paragraph color="text-muted">• selectable - Allow text selection</Paragraph>
                <Paragraph color="text-muted">• lineClamp - Number of lines before truncation</Paragraph>
                <Paragraph color="text-muted">• tabularNumbers - Use tabular number spacing</Paragraph>
            </SectionWrapper>

            <SectionWrapper title="Import">
                <Paragraph color="text-muted">
                    {"import { DiscordHeading, DiscordText, HeadingVariants, TextVariants, TextColors } from \"../components\";"}
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
