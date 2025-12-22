/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaBaseRadioGroup, Paragraph, RadioOption, StandaloneRadioIndicator, useState } from "..";
import { EquicordIcon } from "../icons/EquicordIcon";
import { SectionWrapper } from "../SectionWrapper";

const BASIC_OPTIONS: RadioOption[] = [
    { value: "option1", name: "Option 1" },
    { value: "option2", name: "Option 2" },
    { value: "option3", name: "Option 3" },
];

const OPTIONS_WITH_DESCRIPTIONS: RadioOption[] = [
    { value: "low", name: "Low Quality", desc: "Faster loading, uses less data" },
    { value: "medium", name: "Medium Quality", desc: "Balanced quality and performance" },
    { value: "high", name: "High Quality", desc: "Best quality, uses more data" },
];

const OPTIONS_WITH_ICONS: RadioOption[] = [
    { value: "item1", name: "Item with icon", desc: "This option has an icon", leadingIcon: EquicordIcon },
    { value: "item2", name: "Another with icon", leadingIcon: EquicordIcon },
    { value: "item3", name: "Third with icon", leadingIcon: EquicordIcon },
];

const OPTIONS_MIXED: RadioOption[] = [
    { value: "enabled", name: "Enabled option" },
    { value: "disabled", name: "Disabled option", disabled: true },
    { value: "another", name: "Another enabled" },
];

const NUMBERED_OPTIONS: RadioOption[] = [
    { value: 1, name: "First choice" },
    { value: 2, name: "Second choice" },
    { value: 3, name: "Third choice" },
];

export default function RadioGroupTab() {
    const [basicValue, setBasicValue] = useState<string | number>("option1");
    const [descValue, setDescValue] = useState<string | number>("medium");
    const [iconValue, setIconValue] = useState<string | number>("item1");
    const [mixedValue, setMixedValue] = useState<string | number>("enabled");
    const [numberedValue, setNumberedValue] = useState<number>(1);
    const [unselectedValue, setUnselectedValue] = useState<string | number | undefined>(undefined);
    const [standaloneSelected, setStandaloneSelected] = useState(false);

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Basic">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Simple radio group with text-only options.
                </Paragraph>
                <ManaBaseRadioGroup
                    options={BASIC_OPTIONS}
                    value={basicValue}
                    onChange={setBasicValue}
                />
            </SectionWrapper>

            <SectionWrapper title="With Descriptions">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Radio options with descriptive text using the desc prop.
                </Paragraph>
                <ManaBaseRadioGroup
                    options={OPTIONS_WITH_DESCRIPTIONS}
                    value={descValue}
                    onChange={setDescValue}
                />
            </SectionWrapper>

            <SectionWrapper title="With Leading Icons">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Radio options with icons using leadingIcon prop.
                </Paragraph>
                <ManaBaseRadioGroup
                    options={OPTIONS_WITH_ICONS}
                    value={iconValue}
                    onChange={setIconValue}
                />
            </SectionWrapper>

            <SectionWrapper title="With Disabled Option">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Individual options can be disabled with disabled: true.
                </Paragraph>
                <ManaBaseRadioGroup
                    options={OPTIONS_MIXED}
                    value={mixedValue}
                    onChange={setMixedValue}
                />
            </SectionWrapper>

            <SectionWrapper title="With Numeric Values">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Radio options can use numeric values.
                </Paragraph>
                <ManaBaseRadioGroup
                    options={NUMBERED_OPTIONS}
                    value={numberedValue}
                    onChange={v => setNumberedValue(v as number)}
                />
            </SectionWrapper>

            <SectionWrapper title="No Initial Selection">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Radio group with no initial selection (value undefined).
                </Paragraph>
                <ManaBaseRadioGroup
                    options={BASIC_OPTIONS}
                    value={unselectedValue}
                    onChange={setUnselectedValue}
                />
            </SectionWrapper>

            <SectionWrapper title="Entire Group Disabled">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    The entire group can be disabled with disabled prop.
                </Paragraph>
                <ManaBaseRadioGroup
                    options={BASIC_OPTIONS}
                    value="option2"
                    disabled
                />
            </SectionWrapper>

            <SectionWrapper title="Standalone Radio Indicator">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    A standalone animated radio indicator component. Click to toggle.
                </Paragraph>
                <div
                    onClick={() => setStandaloneSelected(!standaloneSelected)}
                    style={{ cursor: "pointer", display: "inline-block" }}
                >
                    <StandaloneRadioIndicator isSelected={standaloneSelected} />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    <strong>BaseRadioGroup</strong>
                </Paragraph>
                <Paragraph color="text-muted">
                    • options: RadioOption[] - Array of radio options
                </Paragraph>
                <Paragraph color="text-muted">
                    • value?: string | number - Currently selected value
                </Paragraph>
                <Paragraph color="text-muted">
                    • onChange?: (value: string | number) =&gt; void - Called when selection changes
                </Paragraph>
                <Paragraph color="text-muted">
                    • disabled?: boolean - Disable entire group
                </Paragraph>
                <Paragraph color="text-muted">
                    • aria-labelledby?: string - Accessibility label reference
                </Paragraph>
                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>RadioOption</strong>
                </Paragraph>
                <Paragraph color="text-muted">
                    • value: string | number - Option value
                </Paragraph>
                <Paragraph color="text-muted">
                    • name: string - Option label text
                </Paragraph>
                <Paragraph color="text-muted">
                    • desc?: string - Optional description text
                </Paragraph>
                <Paragraph color="text-muted">
                    • disabled?: boolean - Disable individual option
                </Paragraph>
                <Paragraph color="text-muted">
                    • leadingIcon?: React.ComponentType - Icon before radio
                </Paragraph>
                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>StandaloneRadioIndicator</strong>
                </Paragraph>
                <Paragraph color="text-muted">
                    • isSelected: boolean - Whether the indicator is selected
                </Paragraph>
                <Paragraph color="text-muted">
                    • disabled?: boolean - Disable the indicator
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
