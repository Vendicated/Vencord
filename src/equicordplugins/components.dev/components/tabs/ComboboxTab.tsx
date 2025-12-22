/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaButton, ManaCombobox, Paragraph, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

const SAMPLE_ITEMS = [
    { id: "1", label: "Apple" },
    { id: "2", label: "Banana" },
    { id: "3", label: "Cherry" },
    { id: "4", label: "Date" },
    { id: "5", label: "Elderberry" },
    { id: "6", label: "Fig" },
    { id: "7", label: "Grape" },
    { id: "8", label: "Honeydew" },
];

function ComboboxItem({ item, isSelected, onClick }: { item: { id: string; label: string; }; isSelected: boolean; onClick: () => void; }) {
    return (
        <div
            onClick={onClick}
            style={{
                padding: "8px 12px",
                cursor: "pointer",
                background: isSelected ? "var(--background-modifier-selected)" : "transparent",
                borderRadius: 4,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--background-modifier-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = isSelected ? "var(--background-modifier-selected)" : "transparent")}
        >
            {item.label}
        </div>
    );
}

export default function ComboboxTab() {
    const [singleValue, setSingleValue] = useState<string>("");
    const [multiValue, setMultiValue] = useState<string[]>([]);
    const [showDemo, setShowDemo] = useState(false);

    const filterItems = (query: string) =>
        SAMPLE_ITEMS.filter(item =>
            item.label.toLowerCase().includes(query.toLowerCase())
        );

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Combobox">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Searchable dropdown with render props pattern. Children is a function
                    that receives the search query and returns filterable items.
                </Paragraph>
                <ManaButton
                    variant="secondary"
                    text={showDemo ? "Hide Demo" : "Show Demo"}
                    onClick={() => setShowDemo(!showDemo)}
                />
            </SectionWrapper>

            {showDemo && (
                <>
                    <SectionWrapper title="Single Selection">
                        <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                            Selected: {singleValue || "None"}
                        </Paragraph>
                        <div style={{ maxWidth: 300 }}>
                            <ManaCombobox
                                placeholder="Search fruits..."
                                value={singleValue}
                                onChange={v => setSingleValue(v as string)}
                                aria-label="Select a fruit"
                                maxVisibleItems={5}
                                emptyStateHeader="No results"
                                emptyStateText="Try a different search term"
                            >
                                {query => filterItems(query).map(item => (
                                    <ComboboxItem
                                        key={item.id}
                                        item={item}
                                        isSelected={singleValue === item.id}
                                        onClick={() => setSingleValue(item.id)}
                                    />
                                ))}
                            </ManaCombobox>
                        </div>
                    </SectionWrapper>

                    <SectionWrapper title="Multi Selection">
                        <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                            Selected: {multiValue.length ? multiValue.join(", ") : "None"}
                        </Paragraph>
                        <div style={{ maxWidth: 300 }}>
                            <ManaCombobox
                                placeholder="Search fruits..."
                                value={multiValue}
                                onChange={v => setMultiValue(v as string[])}
                                multiSelect
                                aria-label="Select fruits"
                                maxVisibleItems={5}
                            >
                                {query => filterItems(query).map(item => (
                                    <ComboboxItem
                                        key={item.id}
                                        item={item}
                                        isSelected={multiValue.includes(item.id)}
                                        onClick={() => {
                                            if (multiValue.includes(item.id)) {
                                                setMultiValue(multiValue.filter(v => v !== item.id));
                                            } else {
                                                setMultiValue([...multiValue, item.id]);
                                            }
                                        }}
                                    />
                                ))}
                            </ManaCombobox>
                        </div>
                    </SectionWrapper>
                </>
            )}

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">• placeholder - Input placeholder text</Paragraph>
                <Paragraph color="text-muted">• value - Selected value(s)</Paragraph>
                <Paragraph color="text-muted">• onChange - Selection change callback</Paragraph>
                <Paragraph color="text-muted">• multiSelect - Enable multiple selection</Paragraph>
                <Paragraph color="text-muted">• autoFocus - Focus input on mount</Paragraph>
                <Paragraph color="text-muted">• maxVisibleItems - Max items before scroll (default 5)</Paragraph>
                <Paragraph color="text-muted">• emptyStateHeader - Header when no results</Paragraph>
                <Paragraph color="text-muted">• emptyStateText - Text when no results</Paragraph>
                <Paragraph color="text-muted">• children - Function: (query: string) =&gt; ReactNode[]</Paragraph>
            </SectionWrapper>
        </div>
    );
}
