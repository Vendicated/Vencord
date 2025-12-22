/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ListboxItem, ManaListbox, Paragraph, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

const SAMPLE_ITEMS: ListboxItem[] = [
    { id: "1", label: "Apple" },
    { id: "2", label: "Banana" },
    { id: "3", label: "Cherry" },
    { id: "4", label: "Date" },
    { id: "5", label: "Elderberry" },
];

const ITEMS_WITH_DISABLED: ListboxItem[] = [
    { id: "1", label: "Available option" },
    { id: "2", label: "Disabled option", disabled: true },
    { id: "3", label: "Another available" },
    { id: "4", label: "Also disabled", disabled: true },
    { id: "5", label: "Last option" },
];

const MANY_ITEMS: ListboxItem[] = Array.from({ length: 10 }, (_, i) => ({
    id: String(i + 1),
    label: `Item ${i + 1}`,
}));

export default function ListboxTab() {
    const [singleSelected, setSingleSelected] = useState<ListboxItem[]>([SAMPLE_ITEMS[0]]);
    const [multiSelected, setMultiSelected] = useState<ListboxItem[]>([SAMPLE_ITEMS[0], SAMPLE_ITEMS[2]]);
    const [disabledSelected, setDisabledSelected] = useState<ListboxItem[]>([]);
    const [manySelected, setManySelected] = useState<ListboxItem[]>([]);

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Single Selection">
                <ManaListbox
                    items={SAMPLE_ITEMS}
                    selectedItems={singleSelected}
                    onSelectionChange={setSingleSelected}
                    selectionMode="single"
                />
            </SectionWrapper>

            <SectionWrapper title="Multiple Selection">
                <ManaListbox
                    items={SAMPLE_ITEMS}
                    selectedItems={multiSelected}
                    onSelectionChange={setMultiSelected}
                    selectionMode="multiple"
                />
            </SectionWrapper>

            <SectionWrapper title="With Disabled Items">
                <ManaListbox
                    items={ITEMS_WITH_DISABLED}
                    selectedItems={disabledSelected}
                    onSelectionChange={setDisabledSelected}
                    selectionMode="multiple"
                />
            </SectionWrapper>

            <SectionWrapper title="Max Visible Items (5)">
                <ManaListbox
                    items={MANY_ITEMS}
                    selectedItems={manySelected}
                    onSelectionChange={setManySelected}
                    selectionMode="multiple"
                    maxVisibleItems={5}
                />
            </SectionWrapper>

            <SectionWrapper title="Disabled">
                <ManaListbox
                    items={SAMPLE_ITEMS}
                    selectedItems={[SAMPLE_ITEMS[1]]}
                    disabled
                />
            </SectionWrapper>

            <SectionWrapper title="Loading">
                <ManaListbox
                    items={[]}
                    loading
                />
            </SectionWrapper>

            <SectionWrapper title="Empty State">
                <ManaListbox
                    items={[]}
                />
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    <strong>Listbox</strong>
                </Paragraph>
                <Paragraph color="text-muted">
                    • items: ListboxItem[] - Array of items
                </Paragraph>
                <Paragraph color="text-muted">
                    • selectedItems?: ListboxItem[] - Currently selected items
                </Paragraph>
                <Paragraph color="text-muted">
                    • onSelectionChange?: (items: ListboxItem[]) =&gt; void - Selection callback
                </Paragraph>
                <Paragraph color="text-muted">
                    • selectionMode?: "single" | "multiple" - Selection mode
                </Paragraph>
                <Paragraph color="text-muted">
                    • maxVisibleItems?: number - Max visible before scroll
                </Paragraph>
                <Paragraph color="text-muted">
                    • disabled?: boolean - Disable entire listbox
                </Paragraph>
                <Paragraph color="text-muted">
                    • loading?: boolean - Show loading state
                </Paragraph>
                <Paragraph color="text-muted">
                    • typeahead?: boolean - Enable keyboard search
                </Paragraph>
                <Paragraph color="text-muted">
                    • shouldFocusWrap?: boolean - Wrap focus at ends
                </Paragraph>
                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>ListboxItem</strong>
                </Paragraph>
                <Paragraph color="text-muted">
                    • id: string - Unique item ID
                </Paragraph>
                <Paragraph color="text-muted">
                    • label: string - Display label
                </Paragraph>
                <Paragraph color="text-muted">
                    • disabled?: boolean - Disable individual item
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
