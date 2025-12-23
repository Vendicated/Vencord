/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Chip, Paragraph } from "..";
import { SectionWrapper } from "../SectionWrapper";

const CHIP_COLORS = ["blurple", "purple", "green", "orange", "yellow", "pink", "red", "gray"] as const;
const CHIP_SHADES = ["Light", "Medium", "Dark"] as const;

export default function ChipTab() {
    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="All Variants">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    All 24 chip variants: 8 colors × 3 shades.
                </Paragraph>
                {CHIP_SHADES.map(shade => (
                    <div key={shade} style={{ marginBottom: 16 }}>
                        <Paragraph color="text-muted" style={{ marginBottom: 8, fontWeight: 600 }}>
                            {shade}
                        </Paragraph>
                        <div className="vc-compfinder-grid">
                            {CHIP_COLORS.map(color => (
                                <Chip
                                    key={`${color}${shade}`}
                                    text={color}
                                    variant={`${color}${shade}` as any}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </SectionWrapper>

            <SectionWrapper title="Use Cases">
                <div className="vc-compfinder-grid">
                    <Chip text="New" variant="blurpleLight" />
                    <Chip text="Beta" variant="yellowMedium" />
                    <Chip text="Deprecated" variant="redLight" />
                    <Chip text="Stable" variant="greenLight" />
                    <Chip text="Premium" variant="pinkMedium" />
                    <Chip text="Experimental" variant="orangeLight" />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    • text: string - Text to display inside the chip
                </Paragraph>
                <Paragraph color="text-muted">
                    • variant?: ChipVariant - Color variant (default: "grayLight")
                </Paragraph>
                <Paragraph color="text-muted" style={{ marginTop: 8 }}>
                    <strong>Variant Format:</strong> {"{color}{shade}"} where:
                </Paragraph>
                <Paragraph color="text-muted">
                    • Colors: blurple, purple, green, orange, yellow, pink, red, gray
                </Paragraph>
                <Paragraph color="text-muted">
                    • Shades: Light, Medium, Dark
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
