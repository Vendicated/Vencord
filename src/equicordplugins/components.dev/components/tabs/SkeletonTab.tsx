/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaButton, Paragraph, Skeleton, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function SkeletonTab() {
    const [withHeader, setWithHeader] = useState(true);
    const [size, setSize] = useState(5);

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Skeleton">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Loading placeholder with shimmer animation. Used in Discord's member list loading state.
                </Paragraph>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <ManaButton
                        variant="secondary"
                        text={withHeader ? "Hide Header" : "Show Header"}
                        onClick={() => setWithHeader(!withHeader)}
                    />
                    <ManaButton
                        variant="secondary"
                        text="Fewer Items"
                        onClick={() => setSize(Math.max(1, size - 1))}
                    />
                    <ManaButton
                        variant="secondary"
                        text="More Items"
                        onClick={() => setSize(Math.min(20, size + 1))}
                    />
                </div>
                <div className="full-motion">
                    <Skeleton withHeader={withHeader} size={size} />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">• withHeader?: boolean - Show header placeholder (default: true)</Paragraph>
                <Paragraph color="text-muted">• size?: number - Number of skeleton rows to display (default: 15)</Paragraph>
            </SectionWrapper>
        </div>
    );
}
