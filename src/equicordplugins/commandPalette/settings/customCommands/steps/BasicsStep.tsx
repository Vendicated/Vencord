/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { TextInput } from "@webpack/common";

import type { CustomCommandDefinition } from "../../../registry";

interface BasicsStepProps {
    command: CustomCommandDefinition;
    onChange(next: CustomCommandDefinition): void;
}

export function BasicsStep({ command, onChange }: BasicsStepProps) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <TextInput
                label="Command Name"
                value={command.label}
                placeholder="e.g. Open Team Notes"
                onChange={value => onChange({ ...command, label: value })}
            />
            <TextInput
                label="Description (optional)"
                value={command.description ?? ""}
                placeholder="Short subtitle shown in palette"
                onChange={value => onChange({ ...command, description: value })}
            />
        </div>
    );
}
