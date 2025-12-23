/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BadgeShapes, CircleBadge, IconBadge, NumberBadge, Paragraph, TextBadge } from "..";
import { EquicordIcon } from "../icons/EquicordIcon";
import { SectionWrapper } from "../SectionWrapper";

export default function BadgeTab() {
    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="NumberBadge">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Displays a count value. Automatically abbreviates large numbers.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <NumberBadge count={1} />
                    <NumberBadge count={9} />
                    <NumberBadge count={99} />
                    <NumberBadge count={999} />
                    <NumberBadge count={9999} />
                </div>
            </SectionWrapper>

            <SectionWrapper title="TextBadge">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Displays text content.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <TextBadge text="NEW" />
                    <TextBadge text="BETA" />
                    <TextBadge text="PRO" />
                </div>
            </SectionWrapper>

            <SectionWrapper title="IconBadge">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Displays an icon inside a badge.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <IconBadge icon={EquicordIcon} />
                    <IconBadge icon={EquicordIcon} color="var(--status-positive)" />
                    <IconBadge icon={EquicordIcon} color="var(--status-warning)" />
                </div>
            </SectionWrapper>

            <SectionWrapper title="CircleBadge">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    A simple circular badge indicator.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <CircleBadge />
                    <CircleBadge color="var(--status-positive)" />
                    <CircleBadge color="var(--status-warning)" />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Shapes">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Badges support different shapes via the shape prop.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <TextBadge text="ROUND" shape={BadgeShapes.ROUND} />
                    <TextBadge text="LEFT" shape={BadgeShapes.ROUND_LEFT} />
                    <TextBadge text="RIGHT" shape={BadgeShapes.ROUND_RIGHT} />
                    <TextBadge text="SQUARE" shape={BadgeShapes.SQUARE} />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Colors">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Custom colors can be applied. Use disableColor for no background.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <NumberBadge count={5} color="var(--status-danger)" />
                    <NumberBadge count={5} color="var(--status-positive)" />
                    <NumberBadge count={5} color="var(--status-warning)" />
                    <NumberBadge count={5} color="var(--brand-500)" />
                    <NumberBadge count={5} disableColor />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    NumberBadge: count, color?, disableColor?, shape?, className?, style?, renderBadgeCount?
                </Paragraph>
                <Paragraph color="text-muted">
                    TextBadge: text, color?, disableColor?, shape?, className?, style?
                </Paragraph>
                <Paragraph color="text-muted">
                    IconBadge: icon, color?, disableColor?, shape?, className?, style?
                </Paragraph>
                <Paragraph color="text-muted">
                    CircleBadge: color?, disableColor?, shape?, className?, style?
                </Paragraph>
                <Paragraph color="text-muted">
                    BadgeShapes: ROUND, ROUND_LEFT, ROUND_RIGHT, SQUARE
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
