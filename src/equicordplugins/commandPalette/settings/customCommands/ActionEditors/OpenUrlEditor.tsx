/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Paragraph } from "@components/Paragraph";
import { Switch } from "@components/Switch";
import { TextInput } from "@webpack/common";

import type { CustomCommandDefinition } from "../../../registry";

interface OpenUrlEditorProps {
    command: CustomCommandDefinition;
    onChange(next: CustomCommandDefinition): void;
}

export function OpenUrlEditor({ command, onChange }: OpenUrlEditorProps) {
    const url = command.action.type === "url" ? command.action.url : "";
    const openExternal = command.action.type === "url" ? Boolean(command.action.openExternal) : true;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <TextInput
                label="URL"
                value={url}
                placeholder="https://example.com"
                onChange={value => onChange({
                    ...command,
                    action: { type: "url", url: value, openExternal }
                })}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Switch
                    checked={openExternal}
                    onChange={value => onChange({
                        ...command,
                        action: { type: "url", url, openExternal: value }
                    })}
                />
                <Paragraph size="sm">Open externally</Paragraph>
            </div>
        </div>
    );
}
