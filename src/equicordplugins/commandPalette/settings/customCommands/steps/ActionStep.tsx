/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Paragraph } from "@components/Paragraph";
import { Select } from "@webpack/common";

import type { CustomCommandDefinition } from "../../../registry";
import { MacroEditor } from "../ActionEditors/MacroEditor";
import { OpenSettingsEditor } from "../ActionEditors/OpenSettingsEditor";
import { OpenUrlEditor } from "../ActionEditors/OpenUrlEditor";
import { RunCommandEditor } from "../ActionEditors/RunCommandEditor";
import { ACTION_OPTIONS } from "../helpers";
import { getTemplateByActionType } from "../templates";

interface ActionStepProps {
    command: CustomCommandDefinition;
    onChange(next: CustomCommandDefinition): void;
    showAdvanced: boolean;
}

export function ActionStep({ command, onChange, showAdvanced }: ActionStepProps) {
    const template = getTemplateByActionType(command.action.type);
    const availableOptions = command.action.type === "settings"
        ? [...ACTION_OPTIONS, { label: "Open Settings Page", value: "settings" as const }]
        : ACTION_OPTIONS;
    const readOptionValue = (option: unknown) => {
        if (typeof option === "string") return option;
        if (option && typeof option === "object" && "value" in option && typeof (option as { value?: unknown; }).value === "string") {
            return (option as { value: string; }).value;
        }
        return "";
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Select
                options={availableOptions}
                isSelected={option => readOptionValue(option) === command.action.type}
                select={option => {
                    const nextType = readOptionValue(option) as typeof availableOptions[number]["value"];
                    const nextTemplate = getTemplateByActionType(nextType);
                    onChange(nextTemplate.apply(command));
                }}
                serialize={option => option.value}
            />
            <Paragraph size="sm" style={{ color: "var(--text-muted, #a5a6ab)" }}>
                {template.description}
            </Paragraph>

            {command.action.type === "command" && (
                <RunCommandEditor command={command} onChange={onChange} showAdvanced={showAdvanced} />
            )}
            {command.action.type === "settings" && (
                <OpenSettingsEditor command={command} onChange={onChange} showAdvanced={showAdvanced} />
            )}
            {command.action.type === "url" && (
                <OpenUrlEditor command={command} onChange={onChange} />
            )}
            {command.action.type === "macro" && (
                <MacroEditor command={command} onChange={onChange} showAdvanced={showAdvanced} />
            )}
        </div>
    );
}
