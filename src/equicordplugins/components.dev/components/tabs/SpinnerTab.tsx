/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaButton, Paragraph, Spinner, SpinnerTypes, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function SpinnerTab() {
    const [animated, setAnimated] = useState(true);

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Spinner Types">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    All available spinner variants.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    {SpinnerTypes.map(type => (
                        <div key={type} style={{ textAlign: "center", padding: 16 }}>
                            <Spinner type={type} />
                            <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 8 }}>
                                {type}
                            </Paragraph>
                        </div>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Animation Toggle">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Spinners can be paused with animated=false.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <ManaButton
                        variant="secondary"
                        text={animated ? "Pause Animation" : "Resume Animation"}
                        onClick={() => setAnimated(!animated)}
                    />
                </div>
                <div className="vc-compfinder-grid" style={{ marginTop: 16 }}>
                    <div style={{ textAlign: "center", padding: 16 }}>
                        <Spinner type="spinningCircle" animated={animated} />
                        <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 8 }}>
                            animated={animated.toString()}
                        </Paragraph>
                    </div>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Reduced Motion">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    lowMotion type is used when user prefers reduced motion.
                    The component automatically switches to this when reducedMotion is enabled.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <div style={{ textAlign: "center", padding: 16 }}>
                        <Spinner type="lowMotion" />
                    </div>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    • type?: SpinnerType - Spinner variant
                </Paragraph>
                <Paragraph color="text-muted">
                    • animated?: boolean - Enable/disable animation (default: true)
                </Paragraph>
                <Paragraph color="text-muted">
                    • className?: string - Container class
                </Paragraph>
                <Paragraph color="text-muted">
                    • itemClassName?: string - Inner item class
                </Paragraph>
                <Paragraph color="text-muted">
                    • aria-label?: string - Accessibility label
                </Paragraph>
            </SectionWrapper>

            <SectionWrapper title="Type Values">
                <Paragraph color="text-muted">• "wanderingCubes"</Paragraph>
                <Paragraph color="text-muted">• "chasingDots"</Paragraph>
                <Paragraph color="text-muted">• "pulsingEllipsis"</Paragraph>
                <Paragraph color="text-muted">• "spinningCircle"</Paragraph>
                <Paragraph color="text-muted">• "spinningCircleSimple"</Paragraph>
                <Paragraph color="text-muted">• "lowMotion"</Paragraph>
            </SectionWrapper>
        </div>
    );
}
