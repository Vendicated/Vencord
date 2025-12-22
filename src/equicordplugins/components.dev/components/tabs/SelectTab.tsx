/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaSelect, ManaSelectOption, Paragraph, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

const SAMPLE_OPTIONS: ManaSelectOption[] = [
    { id: "1", value: "option1", label: "Option 1" },
    { id: "2", value: "option2", label: "Option 2" },
    { id: "3", value: "option3", label: "Option 3" },
    { id: "4", value: "option4", label: "Option 4" },
];

export default function SelectTab() {
    const [singleValue, setSingleValue] = useState<string>("option1");
    const [multiValue, setMultiValue] = useState<string[]>(["option1", "option2"]);
    const [clearableValue, setClearableValue] = useState<string>("option1");
    const [placeholderValue, setPlaceholderValue] = useState<string>("");

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Single Selection">
                <ManaSelect
                    options={SAMPLE_OPTIONS}
                    value={singleValue}
                    onSelectionChange={v => setSingleValue(v as string)}
                    selectionMode="single"
                />
            </SectionWrapper>

            <SectionWrapper title="Multiple Selection">
                <ManaSelect
                    options={SAMPLE_OPTIONS}
                    value={multiValue}
                    onSelectionChange={v => setMultiValue(v as string[])}
                    selectionMode="multiple"
                />
            </SectionWrapper>

            <SectionWrapper title="With Placeholder">
                <ManaSelect
                    options={SAMPLE_OPTIONS}
                    value={placeholderValue}
                    onSelectionChange={v => setPlaceholderValue(v as string)}
                    placeholder="Select an option..."
                />
            </SectionWrapper>

            <SectionWrapper title="Clearable">
                <ManaSelect
                    options={SAMPLE_OPTIONS}
                    value={clearableValue}
                    onSelectionChange={v => setClearableValue(v as string)}
                    clearable
                />
            </SectionWrapper>

            <SectionWrapper title="Full Width">
                <ManaSelect
                    options={SAMPLE_OPTIONS}
                    value="option1"
                    fullWidth
                />
            </SectionWrapper>

            <SectionWrapper title="Disabled">
                <ManaSelect
                    options={SAMPLE_OPTIONS}
                    value="option2"
                    disabled
                />
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    <strong>ManaSelect</strong> - Note: Uses onSelectionChange, NOT onChange.
                </Paragraph>
                <Paragraph color="text-muted">
                    • options: ManaSelectOption[] - Array of options
                </Paragraph>
                <Paragraph color="text-muted">
                    • value?: string | string[] | null - Selected value(s)
                </Paragraph>
                <Paragraph color="text-muted">
                    • onSelectionChange?: (value) =&gt; void - Called when selection changes
                </Paragraph>
                <Paragraph color="text-muted">
                    • selectionMode?: "single" | "multiple" - Selection mode
                </Paragraph>
                <Paragraph color="text-muted">
                    • placeholder?: string - Placeholder text
                </Paragraph>
                <Paragraph color="text-muted">
                    • clearable?: boolean - Allow clearing selection
                </Paragraph>
                <Paragraph color="text-muted">
                    • fullWidth?: boolean - Expand to full width
                </Paragraph>
                <Paragraph color="text-muted">
                    • disabled?: boolean - Disable select
                </Paragraph>
                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>ManaSelectOption</strong>
                </Paragraph>
                <Paragraph color="text-muted">
                    • id: string - Unique option ID
                </Paragraph>
                <Paragraph color="text-muted">
                    • value: string - Option value
                </Paragraph>
                <Paragraph color="text-muted">
                    • label: string - Display label
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
