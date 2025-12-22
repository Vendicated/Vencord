/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaTextInput, Paragraph, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function TextInputTab() {
    const [basic, setBasic] = useState("Hello world");
    const [sizeSm, setSizeSm] = useState("Small input");
    const [sizeMd, setSizeMd] = useState("Medium input");
    const [withPlaceholder, setWithPlaceholder] = useState("");
    const [clearable, setClearable] = useState("Clear me");
    const [charCount, setCharCount] = useState("Count chars");
    const [error, setError] = useState("Invalid input");

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Basic">
                <ManaTextInput value={basic} onChange={setBasic} />
            </SectionWrapper>

            <SectionWrapper title="Sizes">
                <div className="vc-compfinder-grid-vertical">
                    <ManaTextInput value={sizeSm} onChange={setSizeSm} size="sm" placeholder="Size: sm" />
                    <ManaTextInput value={sizeMd} onChange={setSizeMd} size="md" placeholder="Size: md" />
                </div>
            </SectionWrapper>

            <SectionWrapper title="With Placeholder">
                <ManaTextInput value={withPlaceholder} onChange={setWithPlaceholder} placeholder="Enter text here..." />
            </SectionWrapper>

            <SectionWrapper title="Clearable">
                <ManaTextInput value={clearable} onChange={setClearable} clearable />
            </SectionWrapper>

            <SectionWrapper title="Character Count">
                <ManaTextInput value={charCount} onChange={setCharCount} showCharacterCount maxLength={50} />
            </SectionWrapper>

            <SectionWrapper title="Error State">
                <ManaTextInput value={error} onChange={setError} error />
            </SectionWrapper>

            <SectionWrapper title="States">
                <div className="vc-compfinder-grid-vertical">
                    <ManaTextInput value="Disabled" disabled />
                    <ManaTextInput value="Read only" readOnly />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    • value: string - Input value
                </Paragraph>
                <Paragraph color="text-muted">
                    • onChange?: (value: string) =&gt; void - Called on input change
                </Paragraph>
                <Paragraph color="text-muted">
                    • placeholder?: string - Placeholder text
                </Paragraph>
                <Paragraph color="text-muted">
                    • size?: "sm" | "md" - Input size (default: "md")
                </Paragraph>
                <Paragraph color="text-muted">
                    • clearable?: boolean - Show clear button
                </Paragraph>
                <Paragraph color="text-muted">
                    • showCharacterCount?: boolean - Display character count
                </Paragraph>
                <Paragraph color="text-muted">
                    • maxLength?: number - Maximum character limit
                </Paragraph>
                <Paragraph color="text-muted">
                    • error?: boolean - Show error state styling
                </Paragraph>
                <Paragraph color="text-muted">
                    • disabled?: boolean - Disable input
                </Paragraph>
                <Paragraph color="text-muted">
                    • readOnly?: boolean - Make input read-only
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
