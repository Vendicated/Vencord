/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findComponentByCodeLazy } from "@webpack";

import { ManaSwitch, Paragraph, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

interface SwitchWithLabelProps {
    checked: boolean;
    onChange?: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
    description?: string;
}

const SwitchWithLabel = findComponentByCodeLazy('"data-toggleable-component":"switch"') as React.ComponentType<SwitchWithLabelProps>;

export default function SwitchTab() {
    const [basicOn, setBasicOn] = useState(true);
    const [basicOff, setBasicOff] = useState(false);

    const [labelOn, setLabelOn] = useState(true);
    const [labelOff, setLabelOff] = useState(false);

    const [withDesc, setWithDesc] = useState(true);

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Basic Switch (ManaSwitch)">
                <div className="vc-compfinder-grid">
                    <div className="vc-compfinder-switch-item">
                        <span>On:</span>
                        <ManaSwitch checked={basicOn} onChange={setBasicOn} />
                    </div>
                    <div className="vc-compfinder-switch-item">
                        <span>Off:</span>
                        <ManaSwitch checked={basicOff} onChange={setBasicOff} />
                    </div>
                    <div className="vc-compfinder-switch-item">
                        <span>Disabled On:</span>
                        <ManaSwitch checked={true} disabled />
                    </div>
                    <div className="vc-compfinder-switch-item">
                        <span>Disabled Off:</span>
                        <ManaSwitch checked={false} disabled />
                    </div>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Switch with Label">
                <div className="vc-compfinder-grid-vertical">
                    <SwitchWithLabel
                        label="Enabled option"
                        checked={labelOn}
                        onChange={setLabelOn}
                    />
                    <SwitchWithLabel
                        label="Disabled option"
                        checked={labelOff}
                        onChange={setLabelOff}
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Switch with Description">
                <div className="vc-compfinder-grid-vertical">
                    <SwitchWithLabel
                        label="Feature toggle"
                        description="Enable this feature to unlock additional functionality."
                        checked={withDesc}
                        onChange={setWithDesc}
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Disabled States">
                <div className="vc-compfinder-grid-vertical">
                    <SwitchWithLabel
                        label="Disabled (checked)"
                        checked={true}
                        disabled
                    />
                    <SwitchWithLabel
                        label="Disabled (unchecked)"
                        checked={false}
                        disabled
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    <strong>ManaSwitch</strong> - Basic toggle switch without label.
                </Paragraph>
                <Paragraph color="text-muted">
                    • checked: boolean - Current switch state
                </Paragraph>
                <Paragraph color="text-muted">
                    • onChange?: (checked: boolean) =&gt; void - Called when toggled
                </Paragraph>
                <Paragraph color="text-muted">
                    • disabled?: boolean - Disable interaction
                </Paragraph>
                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>SwitchWithLabel</strong> - Switch with label and description.
                </Paragraph>
                <Paragraph color="text-muted">
                    • label?: string - Label text displayed next to switch
                </Paragraph>
                <Paragraph color="text-muted">
                    • description?: string - Description text below label
                </Paragraph>
                <Paragraph color="text-muted">
                    • checked: boolean - Current switch state
                </Paragraph>
                <Paragraph color="text-muted">
                    • onChange?: (checked: boolean) =&gt; void - Called when toggled
                </Paragraph>
                <Paragraph color="text-muted">
                    • disabled?: boolean - Disable interaction
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
