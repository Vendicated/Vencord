/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, TextButton } from "@components/Button";
import { Paragraph } from "@components/Paragraph";
import { TextInput } from "@webpack/common";

import { openCommandPicker } from "../../../CommandPicker";
import { type CustomCommandDefinition,getCommandById } from "../../../registry";
import { parseCommaListPreserve } from "../helpers";

interface MacroEditorProps {
    command: CustomCommandDefinition;
    onChange(next: CustomCommandDefinition): void;
    showAdvanced: boolean;
}

function moveStep(steps: string[], index: number, direction: -1 | 1): string[] {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= steps.length) return steps;

    const next = [...steps];
    const [step] = next.splice(index, 1);
    next.splice(nextIndex, 0, step);
    return next;
}

export function MacroEditor({ command, onChange, showAdvanced }: MacroEditorProps) {
    const steps = command.action.type === "macro" ? command.action.steps : [];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button
                    size="small"
                    onClick={() => openCommandPicker({
                        onSelect: selected => onChange({
                            ...command,
                            action: { type: "macro", steps: [...steps, selected.id] }
                        })
                    })}
                >
                    Add Step…
                </Button>
                <Button
                    size="small"
                    onClick={() => openCommandPicker({
                        allowMultiple: true,
                        initialSelectedIds: steps,
                        onComplete: (selectedCommands, ids) => {
                            const nextIds = ids ?? selectedCommands.map(selected => selected.id);
                            onChange({
                                ...command,
                                action: { type: "macro", steps: nextIds }
                            });
                        }
                    })}
                >
                    Choose Multiple…
                </Button>
            </div>

            {steps.length === 0 && (
                <Paragraph size="sm" style={{ color: "var(--text-muted, #a5a6ab)" }}>
                    No steps yet. Add at least one command.
                </Paragraph>
            )}

            {steps.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {steps.map((step, index) => {
                        const target = getCommandById(step);
                        const title = target?.label ?? "Unknown command";

                        return (
                            <div
                                key={`${step}-${index}`}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 8,
                                    padding: "8px 10px",
                                    borderRadius: 8,
                                    background: "var(--background-secondary)",
                                    border: "1px solid var(--background-modifier-accent)"
                                }}
                            >
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    <span style={{ color: "var(--text-normal, #dcddde)", fontSize: 13 }}>
                                        {index + 1}. {title}
                                    </span>
                                    <span style={{ color: "var(--text-muted, #a5a6ab)", fontSize: 11 }}>{step}</span>
                                </div>
                                <div style={{ display: "flex", gap: 6 }}>
                                    <TextButton
                                        variant="secondary"
                                        disabled={index === 0}
                                        onClick={() => onChange({
                                            ...command,
                                            action: { type: "macro", steps: moveStep(steps, index, -1) }
                                        })}
                                    >
                                        Up
                                    </TextButton>
                                    <TextButton
                                        variant="secondary"
                                        disabled={index === steps.length - 1}
                                        onClick={() => onChange({
                                            ...command,
                                            action: { type: "macro", steps: moveStep(steps, index, 1) }
                                        })}
                                    >
                                        Down
                                    </TextButton>
                                    <TextButton
                                        variant="secondary"
                                        onClick={() => {
                                            const next = [...steps];
                                            next.splice(index, 1);
                                            onChange({
                                                ...command,
                                                action: { type: "macro", steps: next }
                                            });
                                        }}
                                    >
                                        Remove
                                    </TextButton>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showAdvanced && (
                <TextInput
                    label="Raw Macro IDs"
                    value={steps.join(", ")}
                    placeholder="command-a, command-b"
                    onChange={value => onChange({
                        ...command,
                        action: { type: "macro", steps: parseCommaListPreserve(value) }
                    })}
                />
            )}
        </div>
    );
}
