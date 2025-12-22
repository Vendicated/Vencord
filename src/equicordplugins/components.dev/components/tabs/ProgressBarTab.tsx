/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Paragraph, ProgressBar, useEffect, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function ProgressBarTab() {
    const [animatedProgress, setAnimatedProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setAnimatedProgress(prev => (prev >= 100 ? 0 : prev + 5));
        }, 200);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Variants">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Blue (default) and Orange variants.
                </Paragraph>
                <div className="vc-compfinder-grid-vertical">
                    <div>
                        <Paragraph color="text-muted" style={{ marginBottom: 4 }}>Blue:</Paragraph>
                        <ProgressBar progress={60} variant="blue" />
                    </div>
                    <div>
                        <Paragraph color="text-muted" style={{ marginBottom: 4 }}>Orange:</Paragraph>
                        <ProgressBar progress={60} variant="orange" />
                    </div>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Progress Values">
                <div className="vc-compfinder-grid-vertical">
                    <div>
                        <Paragraph color="text-muted" style={{ marginBottom: 4 }}>0%:</Paragraph>
                        <ProgressBar progress={0} variant="blue" />
                    </div>
                    <div>
                        <Paragraph color="text-muted" style={{ marginBottom: 4 }}>25%:</Paragraph>
                        <ProgressBar progress={25} variant="blue" />
                    </div>
                    <div>
                        <Paragraph color="text-muted" style={{ marginBottom: 4 }}>50%:</Paragraph>
                        <ProgressBar progress={50} variant="blue" />
                    </div>
                    <div>
                        <Paragraph color="text-muted" style={{ marginBottom: 4 }}>75%:</Paragraph>
                        <ProgressBar progress={75} variant="blue" />
                    </div>
                    <div>
                        <Paragraph color="text-muted" style={{ marginBottom: 4 }}>100%:</Paragraph>
                        <ProgressBar progress={100} variant="blue" />
                    </div>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Animated">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Progress: {animatedProgress}%
                </Paragraph>
                <ProgressBar progress={animatedProgress} variant="blue" />
            </SectionWrapper>

            <SectionWrapper title="Custom Range">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Using minimum=0 and maximum=200, progress=150 (75% filled).
                </Paragraph>
                <ProgressBar progress={150} minimum={0} maximum={200} variant="orange" />
            </SectionWrapper>

            <SectionWrapper title="Custom Override">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Using variant="unset" with custom gradient colors.
                </Paragraph>
                <ProgressBar
                    progress={70}
                    variant="unset"
                    override={{
                        default: {
                            background: "rgba(88, 101, 242, 0.3)",
                            gradientStart: "#5865F2",
                            gradientEnd: "#EB459E"
                        }
                    }}
                />
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    • progress: number - Current progress value
                </Paragraph>
                <Paragraph color="text-muted">
                    • minimum?: number - Minimum value (default: 0)
                </Paragraph>
                <Paragraph color="text-muted">
                    • maximum?: number - Maximum value (default: 100)
                </Paragraph>
                <Paragraph color="text-muted">
                    • variant?: "blue" | "orange" | "unset" - Color variant
                </Paragraph>
                <Paragraph color="text-muted">
                    • override?: object - Custom colors when variant="unset"
                </Paragraph>
                <Paragraph color="text-muted">
                    • labelledBy?: string - ID of labelling element for a11y
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
