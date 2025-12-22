/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaCheckbox, Paragraph, useState } from "..";
import { EquicordIcon } from "../icons/EquicordIcon";
import { SectionWrapper } from "../SectionWrapper";

export default function CheckboxTab() {
    const [basicChecked, setBasicChecked] = useState(true);
    const [basicUnchecked, setBasicUnchecked] = useState(false);

    const [withDesc, setWithDesc] = useState(true);

    const [labelPrimary, setLabelPrimary] = useState(true);
    const [labelSecondary, setLabelSecondary] = useState(false);

    const [withIcon, setWithIcon] = useState(true);

    const [usageSingle, setUsageSingle] = useState(true);
    const [usageIndicator, setUsageIndicator] = useState(false);

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Basic">
                <div className="vc-compfinder-grid-vertical">
                    <ManaCheckbox
                        label="Checked"
                        checked={basicChecked}
                        onChange={setBasicChecked}
                    />
                    <ManaCheckbox
                        label="Unchecked"
                        checked={basicUnchecked}
                        onChange={setBasicUnchecked}
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="With Description">
                <div className="vc-compfinder-grid-vertical">
                    <ManaCheckbox
                        label="Option with description"
                        description="This is a helpful description for the option."
                        checked={withDesc}
                        onChange={setWithDesc}
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Label Types">
                <div className="vc-compfinder-grid-vertical">
                    <ManaCheckbox
                        label="Primary label (default)"
                        labelType="primary"
                        checked={labelPrimary}
                        onChange={setLabelPrimary}
                    />
                    <ManaCheckbox
                        label="Secondary label"
                        labelType="secondary"
                        checked={labelSecondary}
                        onChange={setLabelSecondary}
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="With Leading Icon">
                <div className="vc-compfinder-grid-vertical">
                    <ManaCheckbox
                        label="With icon"
                        description="This checkbox has a leading icon."
                        leadingIcon={EquicordIcon}
                        checked={withIcon}
                        onChange={setWithIcon}
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="States">
                <div className="vc-compfinder-grid-vertical">
                    <ManaCheckbox
                        label="Disabled (checked)"
                        checked={true}
                        disabled
                    />
                    <ManaCheckbox
                        label="Disabled (unchecked)"
                        checked={false}
                        disabled
                    />
                    <ManaCheckbox
                        label="Display only"
                        checked={true}
                        displayOnly
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Usage Variants">
                <div className="vc-compfinder-grid-vertical">
                    <ManaCheckbox
                        label="Single (default)"
                        usageVariant="single"
                        checked={usageSingle}
                        onChange={setUsageSingle}
                    />
                    <ManaCheckbox
                        label="Indicator"
                        usageVariant="indicator"
                        checked={usageIndicator}
                        onChange={setUsageIndicator}
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    • checked: boolean - Current checked state
                </Paragraph>
                <Paragraph color="text-muted">
                    • onChange?: (checked: boolean) =&gt; void - Called when toggled
                </Paragraph>
                <Paragraph color="text-muted">
                    • label?: string - Label text
                </Paragraph>
                <Paragraph color="text-muted">
                    • description?: string - Description below label
                </Paragraph>
                <Paragraph color="text-muted">
                    • labelType?: "primary" | "secondary" - Label styling
                </Paragraph>
                <Paragraph color="text-muted">
                    • leadingIcon?: React.ComponentType - Icon before checkbox
                </Paragraph>
                <Paragraph color="text-muted">
                    • usageVariant?: "single" | "indicator" - Visual style
                </Paragraph>
                <Paragraph color="text-muted">
                    • disabled?: boolean - Disable interaction
                </Paragraph>
                <Paragraph color="text-muted">
                    • displayOnly?: boolean - Display without interaction
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
