/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Card, CardVariants, Paragraph } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function CardTab() {
    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Card Variants">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Card component from @components/Card with different severity styles.
                </Paragraph>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {CardVariants.map(variant => (
                        <Card key={variant} variant={variant}>
                            <Paragraph style={{ fontWeight: 600, marginBottom: 4 }}>
                                {variant.charAt(0).toUpperCase() + variant.slice(1)} Card
                            </Paragraph>
                            <Paragraph color="text-muted">
                                This is a {variant} card variant. Use for {
                                    variant === "normal" ? "general content" :
                                        variant === "warning" ? "cautionary messages" :
                                            "error or destructive actions"
                                }.
                            </Paragraph>
                        </Card>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Default Padding">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Cards have 1em padding by default when no className is passed.
                </Paragraph>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginBottom: 4 }}>
                            defaultPadding=true (or no className)
                        </Paragraph>
                        <Card defaultPadding>
                            <Paragraph>Card with default padding</Paragraph>
                        </Card>
                    </div>
                    <div>
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginBottom: 4 }}>
                            defaultPadding=false
                        </Paragraph>
                        <Card defaultPadding={false}>
                            <Paragraph style={{ padding: 8 }}>Card without default padding (content adds own)</Paragraph>
                        </Card>
                    </div>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Nested Cards">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Cards can be nested for complex layouts.
                </Paragraph>
                <Card variant="normal">
                    <Paragraph style={{ fontWeight: 600, marginBottom: 8 }}>Outer Card</Paragraph>
                    <Card variant="warning" style={{ marginBottom: 8 }}>
                        <Paragraph>Nested warning card</Paragraph>
                    </Card>
                    <Card variant="danger">
                        <Paragraph>Nested danger card</Paragraph>
                    </Card>
                </Card>
            </SectionWrapper>

            <SectionWrapper title="Custom Styling">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Cards accept custom className and style props.
                </Paragraph>
                <Card
                    variant="normal"
                    style={{
                        borderLeft: "4px solid var(--text-brand)",
                        borderRadius: 4,
                    }}
                >
                    <Paragraph>Card with custom border accent</Paragraph>
                </Card>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">• variant - "normal" | "warning" | "danger" (default: "normal")</Paragraph>
                <Paragraph color="text-muted">• defaultPadding - Add 1em padding (default: true if no className)</Paragraph>
                <Paragraph color="text-muted">• className - Custom CSS class</Paragraph>
                <Paragraph color="text-muted">• style - Inline styles</Paragraph>
                <Paragraph color="text-muted">• children - Card content</Paragraph>
                <Paragraph color="text-muted">• ...restProps - Any other div attributes</Paragraph>
            </SectionWrapper>

            <SectionWrapper title="Import">
                <Paragraph color="text-muted">
                    {"import { Card } from \"@components/Card\";"}
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
