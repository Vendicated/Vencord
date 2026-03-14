/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, TextButton } from "@components/Button";
import { Heading } from "@components/Heading";
import { React } from "@webpack/common";

import type { CustomCommandDefinition } from "../../registry";
import { CustomCommandWizard } from "./CustomCommandWizard";
import type { CategoryOption } from "./types";

interface CustomCommandCardProps {
    command: CustomCommandDefinition;
    isNew?: boolean;
    startCollapsed?: boolean;
    categoryOptions: CategoryOption[];
    onCommit(command: CustomCommandDefinition): void;
    onRemove(): void;
}

export function CustomCommandCard({ command, isNew, startCollapsed = false, categoryOptions, onCommit, onRemove }: CustomCommandCardProps) {
    const [collapsed, setCollapsed] = React.useState(Boolean(startCollapsed));
    const [wizardKey, setWizardKey] = React.useState(0);
    const [displayLabel, setDisplayLabel] = React.useState(command.label);

    React.useEffect(() => {
        setDisplayLabel(command.label);
    }, [command.id, command.label]);

    return (
        <div style={{ padding: 14, borderRadius: 8, background: "var(--background-tertiary)", border: "none", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Heading tag="h5" style={{ color: "var(--text-normal, #dcddde)", marginBottom: 0 }}>
                    {displayLabel || "Untitled Command"}
                </Heading>
                <div style={{ display: "flex", gap: 8 }}>
                    <TextButton variant="secondary" onClick={() => setCollapsed(value => !value)}>
                        {collapsed ? "Expand" : "Collapse"}
                    </TextButton>
                    <Button variant="dangerPrimary" size="small" onClick={onRemove}>
                        {isNew ? "Discard" : "Remove"}
                    </Button>
                </div>
            </div>

            {!collapsed && (
                <CustomCommandWizard
                    key={wizardKey}
                    command={command}
                    categoryOptions={categoryOptions}
                    onDraftChange={nextCommand => setDisplayLabel(nextCommand.label)}
                    onCommit={nextCommand => {
                        onCommit(nextCommand);
                        setCollapsed(true);
                    }}
                    onCancel={() => {
                        setDisplayLabel(command.label);
                        setWizardKey(value => value + 1);
                    }}
                />
            )}
        </div>
    );
}
