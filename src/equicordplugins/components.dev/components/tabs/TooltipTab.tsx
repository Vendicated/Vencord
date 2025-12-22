/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaButton, ManaTooltip, Paragraph, TooltipColors, TooltipPositions } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function TooltipTab() {
    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Positions">
                <div className="vc-compfinder-grid">
                    {TooltipPositions.map(position => (
                        <ManaTooltip key={position} text={`Tooltip on ${position}`} position={position}>
                            {props => (
                                <ManaButton {...props} variant="secondary" text={position} />
                            )}
                        </ManaTooltip>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Colors">
                <div className="vc-compfinder-grid">
                    {TooltipColors.map(color => (
                        <ManaTooltip key={color} text={`${color} tooltip`} color={color}>
                            {props => (
                                <ManaButton {...props} variant="secondary" text={color} />
                            )}
                        </ManaTooltip>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="With Delay">
                <div className="vc-compfinder-grid">
                    <ManaTooltip text="No delay" delay={0}>
                        {props => (
                            <ManaButton {...props} variant="secondary" text="No delay" />
                        )}
                    </ManaTooltip>
                    <ManaTooltip text="500ms delay" delay={500}>
                        {props => (
                            <ManaButton {...props} variant="secondary" text="500ms delay" />
                        )}
                    </ManaTooltip>
                    <ManaTooltip text="1000ms delay" delay={1000}>
                        {props => (
                            <ManaButton {...props} variant="secondary" text="1s delay" />
                        )}
                    </ManaTooltip>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Hide on Click">
                <div className="vc-compfinder-grid">
                    <ManaTooltip text="Hides when clicked" hideOnClick>
                        {props => (
                            <ManaButton {...props} variant="secondary" text="Click me" />
                        )}
                    </ManaTooltip>
                    <ManaTooltip text="Stays visible when clicked" hideOnClick={false}>
                        {props => (
                            <ManaButton {...props} variant="secondary" text="Click me" />
                        )}
                    </ManaTooltip>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    • text: string - Tooltip content
                </Paragraph>
                <Paragraph color="text-muted">
                    • children: (props) =&gt; ReactNode - Render function for trigger element
                </Paragraph>
                <Paragraph color="text-muted">
                    • position?: "top" | "bottom" | "left" | "right" - Tooltip position
                </Paragraph>
                <Paragraph color="text-muted">
                    • color?: "primary" | "black" | "grey" | "brand" | "green" | "yellow" | "red"
                </Paragraph>
                <Paragraph color="text-muted">
                    • delay?: number - Show delay in milliseconds
                </Paragraph>
                <Paragraph color="text-muted">
                    • hideOnClick?: boolean - Hide tooltip when trigger is clicked
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
