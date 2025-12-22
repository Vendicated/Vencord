/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaButton, ManaButtonSizes, ManaButtonVariants, Paragraph, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function ButtonsTab() {
    const [loading, setLoading] = useState(false);

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Variants (size: md)">
                <div className="vc-compfinder-grid">
                    {ManaButtonVariants.map(variant => (
                        <ManaButton key={variant} variant={variant} size="md" text={variant} />
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Sizes (variant: primary)">
                <div className="vc-compfinder-grid">
                    {ManaButtonSizes.map(size => (
                        <ManaButton key={size} variant="primary" size={size} text={`Size: ${size}`} />
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="States">
                <div className="vc-compfinder-grid">
                    <ManaButton variant="primary" size="md" text="Disabled" disabled />
                    <ManaButton
                        variant="primary"
                        size="md"
                        text={loading ? "Loading..." : "Click to Load"}
                        loading={loading}
                        onClick={() => {
                            setLoading(true);
                            setTimeout(() => setLoading(false), 2000);
                        }}
                    />
                    <ManaButton variant="primary" size="md" text="Rounded" rounded />
                    <ManaButton variant="primary" size="md" text="Full Width" fullWidth />
                </div>
            </SectionWrapper>

            <SectionWrapper title="All Variants Disabled">
                <div className="vc-compfinder-grid">
                    {ManaButtonVariants.map(variant => (
                        <ManaButton key={variant} variant={variant} size="md" text={variant} disabled />
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">• text - Button label text</Paragraph>
                <Paragraph color="text-muted">• variant - primary, secondary, critical-primary, critical-secondary, overlay-primary, overlay-secondary, expressive</Paragraph>
                <Paragraph color="text-muted">• size - xs, sm, md</Paragraph>
                <Paragraph color="text-muted">• disabled - Disable button</Paragraph>
                <Paragraph color="text-muted">• loading - Show loading spinner</Paragraph>
                <Paragraph color="text-muted">• fullWidth - Expand to container width</Paragraph>
                <Paragraph color="text-muted">• rounded - Rounded corners</Paragraph>
                <Paragraph color="text-muted">• icon - Icon component</Paragraph>
                <Paragraph color="text-muted">• iconPosition - start or end</Paragraph>
                <Paragraph color="text-muted">• onClick - Click handler</Paragraph>
            </SectionWrapper>
        </div>
    );
}
