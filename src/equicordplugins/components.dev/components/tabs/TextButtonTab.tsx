/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaTextButton, ManaTextButtonTextVariants, ManaTextButtonVariants, Paragraph } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function TextButtonTab() {
    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Variants">
                <div className="vc-compfinder-grid">
                    {ManaTextButtonVariants.map(variant => (
                        <ManaTextButton
                            key={variant}
                            text={variant}
                            variant={variant}
                        />
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Text Variants">
                <div className="vc-compfinder-grid-vertical">
                    {ManaTextButtonTextVariants.map(textVariant => (
                        <ManaTextButton
                            key={textVariant}
                            text={textVariant}
                            textVariant={textVariant}
                        />
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="States">
                <div className="vc-compfinder-grid">
                    <ManaTextButton text="Normal" />
                    <ManaTextButton text="Disabled" disabled />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Line Clamp">
                <div className="vc-compfinder-grid" style={{ maxWidth: 200 }}>
                    <ManaTextButton
                        text="This is a very long text that should be clamped to one line"
                        lineClamp={1}
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">• text - Button label text</Paragraph>
                <Paragraph color="text-muted">• variant - primary, secondary, always-white, critical</Paragraph>
                <Paragraph color="text-muted">• textVariant - Typography variant (e.g., text-sm/medium)</Paragraph>
                <Paragraph color="text-muted">• lineClamp - Max lines before truncation</Paragraph>
                <Paragraph color="text-muted">• disabled - Disable button</Paragraph>
                <Paragraph color="text-muted">• onClick - Click handler</Paragraph>
            </SectionWrapper>
        </div>
    );
}
