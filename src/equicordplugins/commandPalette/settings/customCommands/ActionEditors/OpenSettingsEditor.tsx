/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Paragraph } from "@components/Paragraph";
import { TextInput } from "@webpack/common";

import { openCommandPicker } from "../../../CommandPicker";
import {
    type CustomCommandDefinition,
    getSettingsCommandMetaById,
    getSettingsCommandMetaByRoute } from "../../../registry";

interface OpenSettingsEditorProps {
    command: CustomCommandDefinition;
    onChange(next: CustomCommandDefinition): void;
    showAdvanced: boolean;
}

export function OpenSettingsEditor({ command, onChange, showAdvanced }: OpenSettingsEditorProps) {
    const route = command.action.type === "settings" ? command.action.route : "";
    const selected = route ? getSettingsCommandMetaByRoute(route) : undefined;
    const summary = selected ? `${selected.label} (${selected.route})` : route || "No page selected.";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ background: "var(--background-secondary)", border: "1px solid var(--background-modifier-accent)", borderRadius: 8, padding: "8px 10px" }}>
                <Paragraph size="sm" style={{ color: "var(--text-muted, #a5a6ab)" }}>
                    Current page: {summary}
                </Paragraph>
            </div>
            <Button
                size="small"
                onClick={() => openCommandPicker({
                    initialSelectedIds: selected ? [selected.id] : undefined,
                    filter: entry => entry.categoryId === "discord-settings",
                    onSelect: selectedCommand => {
                        const meta = getSettingsCommandMetaById(selectedCommand.id);
                        onChange({
                            ...command,
                            action: { type: "settings", route: meta?.route ?? selectedCommand.label }
                        });
                    }
                })}
            >
                Choose Page…
            </Button>
            {showAdvanced && (
                <TextInput
                    label="Settings Route"
                    value={route}
                    placeholder="My Account"
                    onChange={value => onChange({
                        ...command,
                        action: { type: "settings", route: value }
                    })}
                />
            )}
        </div>
    );
}
