/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Accordion, Paragraph, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function AccordionTab() {
    const [controlled, setControlled] = useState(false);

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Basic Accordion">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Click to expand/collapse content.
                </Paragraph>
                <Accordion title="Click to expand">
                    <Paragraph>This is the accordion content that is revealed when expanded.</Paragraph>
                </Accordion>
            </SectionWrapper>

            <SectionWrapper title="With Subtitle">
                <Accordion title="Settings" subtitle="Configure options">
                    <Paragraph>Content with a subtitle in the header.</Paragraph>
                </Accordion>
            </SectionWrapper>

            <SectionWrapper title="Default Expanded">
                <Accordion title="Already Open" defaultExpanded>
                    <Paragraph>This accordion starts expanded by default.</Paragraph>
                </Accordion>
            </SectionWrapper>

            <SectionWrapper title="Controlled">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Use isExpanded and onExpandedChange for controlled state.
                </Paragraph>
                <Accordion
                    title="Controlled Accordion"
                    isExpanded={controlled}
                    onExpandedChange={setControlled}
                >
                    <Paragraph>This accordion's state is controlled externally.</Paragraph>
                </Accordion>
            </SectionWrapper>

            <SectionWrapper title="With Max Height">
                <Accordion title="Limited Height" maxHeight={100}>
                    <Paragraph>Line 1</Paragraph>
                    <Paragraph>Line 2</Paragraph>
                    <Paragraph>Line 3</Paragraph>
                    <Paragraph>Line 4</Paragraph>
                    <Paragraph>Line 5</Paragraph>
                    <Paragraph>Line 6</Paragraph>
                </Accordion>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">• title: string - Header title</Paragraph>
                <Paragraph color="text-muted">• subtitle?: string - Optional subtitle</Paragraph>
                <Paragraph color="text-muted">• icon?: ReactNode - Optional icon</Paragraph>
                <Paragraph color="text-muted">• children: ReactNode - Content</Paragraph>
                <Paragraph color="text-muted">• defaultExpanded?: boolean - Initial state (default: false)</Paragraph>
                <Paragraph color="text-muted">• isExpanded?: boolean - Controlled expanded state</Paragraph>
                <Paragraph color="text-muted">• onExpandedChange?: (expanded: boolean) =&gt; void</Paragraph>
                <Paragraph color="text-muted">• onOpen?: () =&gt; void - Called when opened</Paragraph>
                <Paragraph color="text-muted">• maxHeight?: number | string - Max content height</Paragraph>
            </SectionWrapper>
        </div>
    );
}
