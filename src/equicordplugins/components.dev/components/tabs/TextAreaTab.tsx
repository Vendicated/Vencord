/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaTextArea, Paragraph, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function TextAreaTab() {
    const [basic, setBasic] = useState("Hello world\nThis is a textarea");
    const [withPlaceholder, setWithPlaceholder] = useState("");
    const [autosize, setAutosize] = useState("This textarea will grow as you type more content...");
    const [fixedRows, setFixedRows] = useState("Fixed 5 rows");
    const [charCount, setCharCount] = useState("Count characters");

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Basic">
                <ManaTextArea value={basic} onChange={setBasic} />
            </SectionWrapper>

            <SectionWrapper title="With Placeholder">
                <ManaTextArea value={withPlaceholder} onChange={setWithPlaceholder} placeholder="Enter your message..." />
            </SectionWrapper>

            <SectionWrapper title="Autosize">
                <ManaTextArea value={autosize} onChange={setAutosize} autosize />
            </SectionWrapper>

            <SectionWrapper title="Fixed Rows (5)">
                <ManaTextArea value={fixedRows} onChange={setFixedRows} rows={5} />
            </SectionWrapper>

            <SectionWrapper title="Character Count">
                <ManaTextArea value={charCount} onChange={setCharCount} showCharacterCount maxLength={200} />
            </SectionWrapper>

            <SectionWrapper title="States">
                <div className="vc-compfinder-grid-vertical">
                    <ManaTextArea value="Disabled textarea" disabled />
                    <ManaTextArea value="Read only textarea" readOnly />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    • value: string - Textarea value
                </Paragraph>
                <Paragraph color="text-muted">
                    • onChange?: (value: string) =&gt; void - Called on input change
                </Paragraph>
                <Paragraph color="text-muted">
                    • placeholder?: string - Placeholder text
                </Paragraph>
                <Paragraph color="text-muted">
                    • rows?: number - Fixed number of rows
                </Paragraph>
                <Paragraph color="text-muted">
                    • autosize?: boolean - Auto-grow with content
                </Paragraph>
                <Paragraph color="text-muted">
                    • showCharacterCount?: boolean - Display character count
                </Paragraph>
                <Paragraph color="text-muted">
                    • maxLength?: number - Maximum character limit
                </Paragraph>
                <Paragraph color="text-muted">
                    • disabled?: boolean - Disable textarea
                </Paragraph>
                <Paragraph color="text-muted">
                    • readOnly?: boolean - Make textarea read-only
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
