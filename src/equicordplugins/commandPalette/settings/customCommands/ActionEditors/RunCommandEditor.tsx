/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Paragraph } from "@components/Paragraph";
import { TextInput } from "@webpack/common";

import { openCommandPicker } from "../../../CommandPicker";
import { type CustomCommandDefinition,getCommandById } from "../../../registry";

interface RunCommandEditorProps {
    command: CustomCommandDefinition;
    onChange(next: CustomCommandDefinition): void;
    showAdvanced: boolean;
}

export function RunCommandEditor({ command, onChange, showAdvanced }: RunCommandEditorProps) {
    const targetId = command.action.type === "command" ? command.action.commandId : "";
    const target = targetId ? getCommandById(targetId) : null;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ background: "var(--background-secondary)", border: "1px solid var(--background-modifier-accent)", borderRadius: 8, padding: "8px 10px" }}>
                <Paragraph size="sm" style={{ color: "var(--text-muted, #a5a6ab)" }}>
                    {target ? `Selected command: ${target.label}` : "No command selected yet."}
                </Paragraph>
            </div>
            <Button
                size="small"
                onClick={() => openCommandPicker({
                    initialQuery: targetId,
                    onSelect: selected => onChange({
                        ...command,
                        action: { type: "command", commandId: selected.id }
                    })
                })}
            >
                Choose Command…
            </Button>
            {showAdvanced && (
                <TextInput
                    label="Target Command ID"
                    value={targetId}
                    placeholder="Existing command id"
                    onChange={value => onChange({
                        ...command,
                        action: { type: "command", commandId: value }
                    })}
                />
            )}
        </div>
    );
}
