/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaCombobox } from "@equicordplugins/components.dev";

import { Paragraph, useState } from "..";
import { DocPage, type PropDef } from "../DocPage";

const COMBOBOX_PROPS: PropDef[] = [
    { name: "placeholder", type: "string", description: "Placeholder text for the search input." },
    { name: "value", type: "T | T[]", description: "Currently selected value or array of values for multi-select." },
    { name: "onChange", type: "(value: T | T[]) => void", description: "Called when the selection changes." },
    { name: "multiSelect", type: "boolean", default: "false", description: "Enable multiple selection mode." },
    { name: "autoFocus", type: "boolean", default: "false", description: "Focus the search input on mount." },
    { name: "maxVisibleItems", type: "number", default: "5", description: "Maximum items visible before scrolling." },
    { name: "itemToString", type: "(item: T) => string", description: "Converts an item to a string for display." },
    { name: "emptyStateHeader", type: "string", description: "Header text shown when no results match the query." },
    { name: "emptyStateText", type: "string", description: "Body text shown when no results match the query." },
    { name: "onQueryChange", type: "(query: string) => void", description: "Called when the search query changes. Useful for external filtering." },
    { name: "aria-label", type: "string", description: "Accessibility label for the combobox." },
    { name: "className", type: "string", description: "CSS class for the combobox container." },
    { name: "listClassName", type: "string", description: "CSS class for the dropdown list." },
    { name: "children", type: "(query: string) => ReactNode[]", required: true, description: "Render function receiving the search query. Return filterable items." },
];

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

function filterItems(query: string) {
    return SAMPLE_ITEMS.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase())
    );
}

function SingleSelectDemo() {
    const [value, setValue] = useState<string>("");

    return (
        <div style={{ maxWidth: 300 }}>
            <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                Selected: {SAMPLE_ITEMS.find(i => i.id === value)?.label ?? "None"}
            </Paragraph>
            <ManaCombobox
                placeholder="Search fruits..."
                value={value}
                onChange={v => setValue(v as string)}
                aria-label="Select a fruit"
                maxVisibleItems={5}
                emptyStateHeader="No results"
                emptyStateText="Try a different search term"
            >
                {query => filterItems(query).map(item => (
                    <ComboboxItem
                        key={item.id}
                        item={item}
                        isSelected={value === item.id}
                        onClick={() => setValue(item.id)}
                    />
                ))}
            </ManaCombobox>
        </div>
    );
}

function MultiSelectDemo() {
    const [values, setValues] = useState<string[]>([]);

    return (
        <div style={{ maxWidth: 300 }}>
            <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                Selected: {values.length ? values.map(v => SAMPLE_ITEMS.find(i => i.id === v)?.label).join(", ") : "None"}
            </Paragraph>
            <ManaCombobox
                placeholder="Search fruits..."
                value={values}
                onChange={v => setValues(v as string[])}
                multiSelect
                aria-label="Select fruits"
                maxVisibleItems={5}
            >
                {query => filterItems(query).map(item => (
                    <ComboboxItem
                        key={item.id}
                        item={item}
                        isSelected={values.includes(item.id)}
                        onClick={() => {
                            if (values.includes(item.id)) {
                                setValues(values.filter(v => v !== item.id));
                            } else {
                                setValues([...values, item.id]);
                            }
                        }}
                    />
                ))}
            </ManaCombobox>
        </div>
    );
}

function EmptyStateDemo() {
    return (
        <div style={{ maxWidth: 300 }}>
            <ManaCombobox
                placeholder="Type something that won't match..."
                value=""
                onChange={() => { }}
                aria-label="Empty state demo"
                emptyStateHeader="Nothing found"
                emptyStateText="We couldn't find what you're looking for."
            >
                {() => []}
            </ManaCombobox>
        </div>
    );
}

export default function ComboboxTab() {
    return (
        <DocPage
            componentName="ManaCombobox"
            overview="ManaCombobox is Discord's searchable dropdown component using a render props pattern. Children is a function that receives the search query and returns filterable items. Supports single and multi-select modes, custom empty states, and external query tracking."
            notices={[
                { type: "warn", children: "ManaCombobox uses a render props pattern where children is a function. You are responsible for filtering items based on the query parameter. The component does not filter automatically." },
            ]}
            importPath={'import { ManaCombobox } from "../components";'}
            sections={[
                {
                    title: "Single Selection",
                    description: "Basic combobox with single item selection. Type to filter the list.",
                    children: <SingleSelectDemo />,
                    code: `<ManaCombobox
  placeholder="Search fruits..."
  value={value}
  onChange={v => setValue(v as string)}
  aria-label="Select a fruit"
  maxVisibleItems={5}
  emptyStateHeader="No results"
  emptyStateText="Try a different search term"
>
  {query => filterItems(query).map(item => (
    <ComboboxItem key={item.id} item={item} />
  ))}
</ManaCombobox>`,
                    relevantProps: ["value", "onChange", "placeholder", "maxVisibleItems"],
                },
                {
                    title: "Multi Selection",
                    description: "Enable multiSelect to allow choosing multiple items at once.",
                    children: <MultiSelectDemo />,
                    code: `<ManaCombobox
  placeholder="Search fruits..."
  value={values}
  onChange={v => setValues(v as string[])}
  multiSelect
  aria-label="Select fruits"
>
  {query => filterItems(query).map(item => (
    <ComboboxItem key={item.id} item={item} />
  ))}
</ManaCombobox>`,
                    relevantProps: ["multiSelect"],
                },
                {
                    title: "Empty State",
                    description: "Custom header and text shown when the children function returns an empty array.",
                    children: <EmptyStateDemo />,
                    relevantProps: ["emptyStateHeader", "emptyStateText"],
                },
            ]}
            props={COMBOBOX_PROPS}
        />
    );
}
