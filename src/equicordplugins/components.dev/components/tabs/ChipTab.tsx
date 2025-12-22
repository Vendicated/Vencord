/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Chip , Paragraph } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function ChipTab() {
    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Colors">
                <div className="vc-compfinder-grid">
                    <Chip text="Blurple" variant="blurpleMedium" />
                    <Chip text="Purple" variant="purpleMedium" />
                    <Chip text="Green" variant="greenMedium" />
                    <Chip text="Orange" variant="orangeMedium" />
                    <Chip text="Yellow" variant="yellowMedium" />
                    <Chip text="Pink" variant="pinkMedium" />
                    <Chip text="Red" variant="redMedium" />
                    <Chip text="Gray" variant="grayMedium" />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Shades">
                <div className="vc-compfinder-grid">
                    <Chip text="Light" variant="blurpleLight" />
                    <Chip text="Medium" variant="blurpleMedium" />
                    <Chip text="Dark" variant="blurpleDark" />
                </div>
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
            </SectionWrapper>
        </div>
    );
}
