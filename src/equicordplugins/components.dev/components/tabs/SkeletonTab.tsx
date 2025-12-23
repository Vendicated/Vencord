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
            <SectionWrapper title="Skeleton">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Loading placeholder with pulse animation. Used in Discord's shop for product cards.
                </Paragraph>
                <ManaButton
                    variant="secondary"
                    text={animated ? "Disable Animation" : "Enable Animation"}
                    onClick={() => setAnimated(!animated)}
                    style={{ marginBottom: 16 }}
                />
                <div className="full-motion">
                    <Skeleton skipPulseAnimation={!animated} />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">• skipPulseAnimation?: boolean - Disable pulse animation</Paragraph>
            </SectionWrapper>
        </div>
    );
}
