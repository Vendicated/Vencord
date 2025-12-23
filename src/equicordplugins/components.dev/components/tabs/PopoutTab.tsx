/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Clickable, ManaButton, Paragraph, Popout, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function PopoutTab() {
    const [showBasic, setShowBasic] = useState(false);
    const [showPositions, setShowPositions] = useState<Record<string, boolean>>({});

    const positions = ["top", "bottom", "left", "right"] as const;

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Basic Popout">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Click the button to toggle a popout.
                </Paragraph>
                <Popout
                    shouldShow={showBasic}
                    onRequestClose={() => setShowBasic(false)}
                    renderPopout={() => (
                        <div style={{ padding: 16, background: "var(--background-floating)", borderRadius: 8 }}>
                            <Paragraph>This is a popout!</Paragraph>
                            <ManaButton
                                variant="secondary"
                                text="Close"
                                onClick={() => setShowBasic(false)}
                                style={{ marginTop: 8 }}
                            />
                        </div>
                    )}
                >
                    {(props, { isShown }) => (
                        <Clickable {...props}>
                            <ManaButton
                                variant={isShown ? "primary" : "secondary"}
                                text={isShown ? "Popout Open" : "Open Popout"}
                                onClick={() => setShowBasic(!showBasic)}
                            />
                        </Clickable>
                    )}
                </Popout>
            </SectionWrapper>

            <SectionWrapper title="Positions">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Popout can appear in different positions.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    {positions.map(position => (
                        <Popout
                            key={position}
                            position={position}
                            shouldShow={showPositions[position] ?? false}
                            onRequestClose={() => setShowPositions(p => ({ ...p, [position]: false }))}
                            renderPopout={() => (
                                <div style={{ padding: 12, background: "var(--background-floating)", borderRadius: 8 }}>
                                    <Paragraph>Position: {position}</Paragraph>
                                </div>
                            )}
                        >
                            {(props, { isShown }) => (
                                <Clickable {...props}>
                                    <ManaButton
                                        variant={isShown ? "primary" : "secondary"}
                                        text={position}
                                        onClick={() => setShowPositions(p => ({ ...p, [position]: !p[position] }))}
                                    />
                                </Clickable>
                            )}
                        </Popout>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Animation Types">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Popout supports different animation types via Popout.Animation.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    {(["NONE", "TRANSLATE", "SCALE", "FADE"] as const).map(anim => (
                        <Popout
                            key={anim}
                            animation={Popout.Animation[anim]}
                            shouldShow={showPositions[`anim-${anim}`] ?? false}
                            onRequestClose={() => setShowPositions(p => ({ ...p, [`anim-${anim}`]: false }))}
                            renderPopout={() => (
                                <div style={{ padding: 12, background: "var(--background-floating)", borderRadius: 8 }}>
                                    <Paragraph>Animation: {anim}</Paragraph>
                                </div>
                            )}
                        >
                            {(props, { isShown }) => (
                                <Clickable {...props}>
                                    <ManaButton
                                        variant={isShown ? "primary" : "secondary"}
                                        text={anim}
                                        onClick={() => setShowPositions(p => ({ ...p, [`anim-${anim}`]: !p[`anim-${anim}`] }))}
                                    />
                                </Clickable>
                            )}
                        </Popout>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">• children - Render function (props, data) =&gt; ReactNode</Paragraph>
                <Paragraph color="text-muted">• renderPopout - Render function for popout content</Paragraph>
                <Paragraph color="text-muted">• shouldShow - Control visibility</Paragraph>
                <Paragraph color="text-muted">• position - top, bottom, left, right, center, window_center</Paragraph>
                <Paragraph color="text-muted">• align - left, right, center, top, bottom</Paragraph>
                <Paragraph color="text-muted">• animation - Popout.Animation.NONE/TRANSLATE/SCALE/FADE</Paragraph>
                <Paragraph color="text-muted">• spacing - Distance from target (default 8)</Paragraph>
                <Paragraph color="text-muted">• onRequestOpen/onRequestClose - Callbacks</Paragraph>
                <Paragraph color="text-muted">• autoInvert - Auto-flip if near edge (default true)</Paragraph>
            </SectionWrapper>
        </div>
    );
}
