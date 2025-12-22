/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CheckboxGroupOption, ManaCheckboxGroup, Paragraph, useState } from "..";
import { EquicordIcon } from "../icons/EquicordIcon";
import { SectionWrapper } from "../SectionWrapper";

const BASIC_OPTIONS: CheckboxGroupOption[] = [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
];

const OPTIONS_WITH_DESCRIPTIONS: CheckboxGroupOption[] = [
    { value: "notifications", label: "Notifications", description: "Receive push notifications" },
    { value: "sounds", label: "Sounds", description: "Play sounds for events" },
    { value: "badges", label: "Badges", description: "Show unread badges" },
];

const OPTIONS_WITH_ICONS: CheckboxGroupOption[] = [
    { value: "item1", label: "Item with icon", description: "This option has an icon", leadingIcon: EquicordIcon },
    { value: "item2", label: "Another with icon", leadingIcon: EquicordIcon },
    { value: "item3", label: "Third with icon", leadingIcon: EquicordIcon },
];

const OPTIONS_MIXED: CheckboxGroupOption[] = [
    { value: "enabled", label: "Enabled option" },
    { value: "disabled", label: "Disabled option", disabled: true },
    { value: "another", label: "Another enabled" },
];

export default function CheckboxGroupTab() {
    const [basicSelected, setBasicSelected] = useState<(string | number)[]>(["option1"]);
    const [descSelected, setDescSelected] = useState<(string | number)[]>(["notifications", "sounds"]);
    const [iconSelected, setIconSelected] = useState<(string | number)[]>(["item1"]);
    const [mixedSelected, setMixedSelected] = useState<(string | number)[]>(["enabled"]);

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Basic">
                <ManaCheckboxGroup
                    options={BASIC_OPTIONS}
                    selectedValues={basicSelected}
                    onChange={setBasicSelected}
                />
            </SectionWrapper>

            <SectionWrapper title="With Descriptions">
                <ManaCheckboxGroup
                    options={OPTIONS_WITH_DESCRIPTIONS}
                    selectedValues={descSelected}
                    onChange={setDescSelected}
                />
            </SectionWrapper>

            <SectionWrapper title="With Leading Icons">
                <ManaCheckboxGroup
                    options={OPTIONS_WITH_ICONS}
                    selectedValues={iconSelected}
                    onChange={setIconSelected}
                />
            </SectionWrapper>

            <SectionWrapper title="With Disabled Option">
                <ManaCheckboxGroup
                    options={OPTIONS_MIXED}
                    selectedValues={mixedSelected}
                    onChange={setMixedSelected}
                />
            </SectionWrapper>

            <SectionWrapper title="Entire Group Disabled">
                <ManaCheckboxGroup
                    options={BASIC_OPTIONS}
                    selectedValues={["option1", "option2"]}
                    disabled
                />
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    <strong>CheckboxGroup</strong>
                </Paragraph>
                <Paragraph color="text-muted">
                    • options: CheckboxGroupOption[] - Array of options
                </Paragraph>
                <Paragraph color="text-muted">
                    • selectedValues: (string | number)[] - Currently selected values
                </Paragraph>
                <Paragraph color="text-muted">
                    • onChange?: (values: (string | number)[]) =&gt; void - Called when selection changes
                </Paragraph>
                <Paragraph color="text-muted">
                    • disabled?: boolean - Disable entire group
                </Paragraph>
                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>CheckboxGroupOption</strong>
                </Paragraph>
                <Paragraph color="text-muted">
                    • value: string | number - Option value
                </Paragraph>
                <Paragraph color="text-muted">
                    • label: string - Option label
                </Paragraph>
                <Paragraph color="text-muted">
                    • description?: string - Optional description
                </Paragraph>
                <Paragraph color="text-muted">
                    • disabled?: boolean - Disable individual option
                </Paragraph>
                <Paragraph color="text-muted">
                    • leadingIcon?: React.ComponentType - Icon before checkbox
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
