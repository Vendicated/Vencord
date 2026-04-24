/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Chip } from "@equicordplugins/components.dev";

import { Paragraph } from "..";
import { DocPage, type PropDef } from "../DocPage";

const CHIP_COLORS = ["blurple", "purple", "green", "orange", "yellow", "pink", "red", "gray"] as const;
const CHIP_SHADES = ["Light", "Medium", "Dark"] as const;

const CHIP_PROPS: PropDef[] = [
    { name: "text", type: "string", required: true, description: "Text displayed inside the chip." },
    { name: "variant", type: "ChipVariant", default: '"grayLight"', description: "Color variant in the format {color}{shade}. 8 colors (blurple, purple, green, orange, yellow, pink, red, gray) times 3 shades (Light, Medium, Dark) for 24 total variants." },
];

export default function ChipTab() {
    return (
        <DocPage
            componentName="Chip"
            overview="Chip is a small label component used for tags, statuses, and categories. It renders text in an eyebrow style with a colored background. Supports 24 variants across 8 colors and 3 shade levels."
            importPath={'import { Chip } from "../components";'}
            sections={[
                {
                    title: "All Variants",
                    description: "All 24 chip variants: 8 colors times 3 shades.",
                    children: (
                        <>
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
                        </>
                    ),
                    code: '<Chip text="New" variant="blurpleLight" />',
                    relevantProps: ["variant"],
                },
                {
                    title: "Use Cases",
                    description: "Common patterns for status labels and tags.",
                    children: (
                        <div className="vc-compfinder-grid">
                            <Chip text="New" variant="blurpleLight" />
                            <Chip text="Beta" variant="yellowMedium" />
                            <Chip text="Deprecated" variant="redLight" />
                            <Chip text="Stable" variant="greenLight" />
                            <Chip text="Premium" variant="pinkMedium" />
                            <Chip text="Experimental" variant="orangeLight" />
                        </div>
                    ),
                },
            ]}
            props={CHIP_PROPS}
        />
    );
}
