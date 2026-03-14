/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Paragraph } from "@components/Paragraph";
import { Switch } from "@components/Switch";
import { React, Select, TextInput } from "@webpack/common";

import { type CustomCommandIconId,getCustomCommandIconMetaList } from "../../customCommandIcons";
import { type CustomCommandDefinition, getCategoryPath } from "../../registry";
import { parseCommaListPreserve } from "./helpers";
import type { CategoryOption } from "./types";

interface AdvancedSectionProps {
    command: CustomCommandDefinition;
    categoryOptions: CategoryOption[];
    onChange(next: CustomCommandDefinition): void;
}

export function AdvancedSection({ command, categoryOptions, onChange }: AdvancedSectionProps) {
    const [keywordsInput, setKeywordsInput] = React.useState((command.keywords ?? []).join(", "));
    const keywordsRef = React.useRef((command.keywords ?? []).join(", "));

    React.useEffect(() => {
        const nextValue = (command.keywords ?? []).join(", ");
        if (keywordsRef.current === nextValue) return;
        setKeywordsInput(nextValue);
    }, [command.keywords]);

    const readOptionValue = (option: unknown) => {
        if (typeof option === "string") return option;
        if (option && typeof option === "object" && "value" in option && typeof (option as { value?: unknown; }).value === "string") {
            return (option as { value: string; }).value;
        }
        return "";
    };
    const iconOptions = React.useMemo(() => getCustomCommandIconMetaList().map(iconMeta => ({
        value: iconMeta.id,
        label: iconMeta.label
    })), []);
    const selectedIconId = command.iconId ?? "auto";

    const categoryId = command.categoryId ?? "";
    const categoryPath = categoryId ? getCategoryPath(categoryId) : [];
    const categoryLabel = categoryId
        ? (categoryPath.length ? categoryPath.map(item => item.label).join(" › ") : categoryId)
        : "Auto (default)";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, background: "var(--background-secondary)", borderRadius: 8, padding: 12 }}>
            <TextInput
                label="Keywords"
                value={keywordsInput}
                placeholder="Comma-separated keywords"
                onChange={value => {
                    setKeywordsInput(value);
                    keywordsRef.current = value;
                }}
                onBlur={() => onChange({ ...command, keywords: parseCommaListPreserve(keywordsRef.current) })}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Select
                    options={categoryOptions}
                    isSelected={option => readOptionValue(option) === categoryId}
                    select={option => {
                        const value = readOptionValue(option);
                        onChange({ ...command, categoryId: value || undefined });
                    }}
                    serialize={option => option.value}
                />
                <Paragraph size="xs" style={{ color: "var(--text-muted, #a5a6ab)", fontSize: 12 }}>
                    Choose where this command appears in the palette.
                </Paragraph>
                {categoryId && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "2px 10px", fontSize: 12, background: "var(--background-base-low)", color: "var(--text-normal, #dcddde)" }}>
                        {categoryLabel}
                        <span style={{ color: "var(--text-muted, #a5a6ab)" }}>· {categoryId}</span>
                    </span>
                )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Select
                    options={iconOptions}
                    isSelected={option => readOptionValue(option) === selectedIconId}
                    select={option => {
                        const value = readOptionValue(option) as CustomCommandIconId;
                        onChange({ ...command, iconId: value });
                    }}
                    serialize={option => option.value}
                />
                <Paragraph size="xs" style={{ color: "var(--text-muted, #a5a6ab)", fontSize: 12 }}>
                    Choose an icon for this command. Auto follows the action type.
                </Paragraph>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Switch checked={Boolean(command.showConfirmation)} onChange={value => onChange({ ...command, showConfirmation: value })} />
                <Paragraph size="sm">Show confirmation</Paragraph>
            </div>
        </div>
    );
}
