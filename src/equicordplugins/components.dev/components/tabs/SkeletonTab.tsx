/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaButton, Paragraph, Skeleton, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function SkeletonTab() {
    const [animated, setAnimated] = useState(true);

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Default Skeleton">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Loading placeholder with pulse animation. Requires "full-motion" parent class for animation.
                </Paragraph>
                <div className="vc-compfinder-grid full-motion">
                    <Skeleton />
                    <Skeleton />
                    <Skeleton />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Animation Toggle">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Use skipPulseAnimation to disable the pulse effect.
                </Paragraph>
                <ManaButton
                    variant="secondary"
                    text={animated ? "Disable Animation" : "Enable Animation"}
                    onClick={() => setAnimated(!animated)}
                />
                <div className="vc-compfinder-grid full-motion" style={{ marginTop: 16 }}>
                    <Skeleton skipPulseAnimation={!animated} />
                    <Skeleton skipPulseAnimation={!animated} />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    • skipPulseAnimation?: boolean - Disable pulse animation (default: false)
                </Paragraph>
            </SectionWrapper>

            <SectionWrapper title="Notes">
                <Paragraph color="text-muted">
                    • This is a product card skeleton used in Discord's shop.
                </Paragraph>
                <Paragraph color="text-muted">
                    • Animation requires a parent with "full-motion" class (Discord's reduced motion setting).
                </Paragraph>
                <Paragraph color="text-muted">
                    • The skeleton has fixed dimensions designed for product cards.
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
