/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Paragraph, Slider, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function SliderTab() {
    const [basicValue, setBasicValue] = useState(50);
    const [markerValue, setMarkerValue] = useState(50);
    const [miniValue, setMiniValue] = useState(30);

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Basic Slider">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Value: {basicValue}
                </Paragraph>
                <Slider
                    initialValue={basicValue}
                    minValue={0}
                    maxValue={100}
                    onValueChange={setBasicValue}
                />
            </SectionWrapper>

            <SectionWrapper title="With Markers">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Value: {markerValue}
                </Paragraph>
                <Slider
                    initialValue={markerValue}
                    minValue={0}
                    maxValue={100}
                    markers={[0, 25, 50, 75, 100]}
                    onValueChange={setMarkerValue}
                    onMarkerRender={(v: number) => `${v}%`}
                />
            </SectionWrapper>

            <SectionWrapper title="Stick to Markers">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Value snaps to markers.
                </Paragraph>
                <Slider
                    initialValue={50}
                    minValue={0}
                    maxValue={100}
                    markers={[0, 25, 50, 75, 100]}
                    stickToMarkers
                    onMarkerRender={(v: number) => `${v}%`}
                />
            </SectionWrapper>

            <SectionWrapper title="Mini Slider">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Value: {miniValue}
                </Paragraph>
                <div style={{ width: 200 }}>
                    <Slider
                        initialValue={miniValue}
                        minValue={0}
                        maxValue={100}
                        mini
                        onValueChange={setMiniValue}
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Disabled">
                <Slider
                    initialValue={60}
                    minValue={0}
                    maxValue={100}
                    disabled
                />
            </SectionWrapper>

            <SectionWrapper title="Custom Range">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Range: -50 to 50
                </Paragraph>
                <Slider
                    initialValue={0}
                    minValue={-50}
                    maxValue={50}
                    markers={[-50, -25, 0, 25, 50]}
                    onMarkerRender={(v: number) => v.toString()}
                />
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">• initialValue / value - Current value</Paragraph>
                <Paragraph color="text-muted">• minValue / maxValue - Range bounds</Paragraph>
                <Paragraph color="text-muted">• onValueChange - Change callback</Paragraph>
                <Paragraph color="text-muted">• markers - Array of marker values</Paragraph>
                <Paragraph color="text-muted">• stickToMarkers - Snap to markers</Paragraph>
                <Paragraph color="text-muted">• onMarkerRender - Custom marker labels</Paragraph>
                <Paragraph color="text-muted">• mini - Compact style</Paragraph>
                <Paragraph color="text-muted">• hideBubble - Hide value tooltip</Paragraph>
                <Paragraph color="text-muted">• disabled - Disable interaction</Paragraph>
            </SectionWrapper>
        </div>
    );
}
