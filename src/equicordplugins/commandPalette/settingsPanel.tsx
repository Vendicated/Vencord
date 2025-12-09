/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, TextButton } from "@components/Button";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Switch } from "@components/Switch";
import { React, Select, TextInput } from "@webpack/common";

import { openCommandPicker } from "./CommandPicker";
import {
    type CustomCommandDefinition,
    getCategoryPath,
    getCommandById,
    getCustomCommandsSnapshot,
    getSettingsCommandMetaById,
    getSettingsCommandMetaByRoute,
    listAllTags,
    listCategories,
    normalizeTag,
    saveCustomCommands,
    subscribeCustomCommands,
    subscribeRegistry
} from "./registry";

const ACTION_OPTIONS = [
    { label: "Run Command", value: "command" },
    { label: "Open Settings Page", value: "settings" },
    { label: "Open URL", value: "url" },
    { label: "Run Macro", value: "macro" }
] as const;

type ActionType = typeof ACTION_OPTIONS[number]["value"];

const ACTION_HELP_TEXT: Record<ActionType, string> = {
    command: "Alias another palette command by ID. Use the picker if you’re unsure of the identifier.",
    settings: "Jump directly to a Discord settings page. Choose a page from the picker.",
    url: "Open a link. Use https:// links for best compatibility.",
    macro: "Run a sequence of commands in order. Add steps via the picker."
};

type CategoryOption = { label: string; value: string; description?: string; };

function buildCategoryOptions(): CategoryOption[] {
    const categories = listCategories();
    const options: CategoryOption[] = categories.map(category => {
        const path = getCategoryPath(category.id);
        const label = path.length ? path.map(item => item.label).join(" › ") : category.label;
        return {
            label: `${label} (${category.id})`,
            value: category.id,
            description: category.description
        } satisfies CategoryOption;
    });
    return [
        {
            label: "Auto (use default placement)",
            value: ""
        },
        ...options
    ];
}

function createDefaultCommand(): CustomCommandDefinition {
    const baseId = `custom-${Math.random().toString(36).slice(2, 8)}`;
    return {
        id: baseId,
        label: "New Command",
        keywords: [],
        tags: [],
        categoryId: undefined,
        description: "",
        danger: false,
        action: {
            type: "command",
            commandId: ""
        }
    };
}

function normalizeTagList(values: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const raw of values) {
        const trimmed = raw.trim();
        if (!trimmed) continue;
        const slug = normalizeTag(trimmed);
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);
        result.push(trimmed);
    }
    return result;
}

function duplicateWithUpdates(command: CustomCommandDefinition, updates: Partial<CustomCommandDefinition>): CustomCommandDefinition {
    const nextTags = updates.tags !== undefined ? normalizeTagList(updates.tags) : command.tags;
    return {
        ...command,
        ...updates,
        keywords: updates.keywords ?? command.keywords,
        tags: nextTags,
        action: updates.action ?? command.action
    };
}

type TemplateConfig = {
    label: string;
    description: string;
    apply(command: CustomCommandDefinition): CustomCommandDefinition;
};

const TEMPLATE_CONFIGS: TemplateConfig[] = [
    {
        label: "Alias",
        description: "Mirror an existing command",
        apply: command => duplicateWithUpdates(command, {
            action: { type: "command", commandId: "" }
        })
    },
    {
        label: "Settings",
        description: "Open Discord settings",
        apply: command => duplicateWithUpdates(command, {
            action: { type: "settings", route: "My Account" }
        })
    },
    {
        label: "Link",
        description: "Open an external URL",
        apply: command => duplicateWithUpdates(command, {
            action: { type: "url", url: "https://", openExternal: true }
        })
    },
    {
        label: "Macro",
        description: "Run multiple commands",
        apply: command => duplicateWithUpdates(command, {
            action: { type: "macro", steps: [] }
        })
    }
];

function parseListInput(value: string): string[] {
    const parts = value
        .split(",")
        .map(item => item.trim());
    return normalizeTagList(parts);
}

function renderActionFields(command: CustomCommandDefinition, onChange: (action: CustomCommandDefinition["action"]) => void) {
    const { action } = command;

    switch (action.type) {
        case "command":
            const trimmedId = action.commandId.trim();
            let commandError: string | undefined;
            if (!trimmedId) {
                commandError = "Enter a command ID or choose one below.";
            } else if (!getCommandById(trimmedId)) {
                commandError = "No command matches this ID.";
            }
            return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <TextInput
                        label="Target Command ID"
                        value={action.commandId}
                        placeholder="Existing command id"
                        error={commandError}
                        onChange={value => onChange({ type: "command", commandId: value })}
                    />
                    <Button
                        size="small"
                        onClick={() => openCommandPicker({
                            initialQuery: action.commandId,
                            onSelect: command => onChange({ type: "command", commandId: command.id })
                        })}
                    >
                        Choose Command…
                    </Button>
                </div>
            );
        case "settings": {
            const selectedSettings = action.route ? getSettingsCommandMetaByRoute(action.route) : undefined;
            const currentSummary = selectedSettings
                ? `${selectedSettings.label} (${selectedSettings.route})`
                : action.route || "No page selected";

            return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <Paragraph size="sm" style={{ color: "var(--text-muted, #a5a6ab)" }}>
                        Current page: {currentSummary}
                    </Paragraph>
                    <Button
                        size="small"
                        onClick={() => openCommandPicker({
                            initialSelectedIds: selectedSettings ? [selectedSettings.id] : undefined,
                            filter: entry => entry.categoryId === "discord-settings",
                            onSelect: command => {
                                const meta = getSettingsCommandMetaById(command.id);
                                onChange({ type: "settings", route: meta?.route ?? command.label });
                            }
                        })}
                    >
                        Choose Page…
                    </Button>
                </div>
            );
        }
        case "url": {
            let urlError: string | undefined;
            const trimmedUrl = action.url.trim();
            if (trimmedUrl && !trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
                urlError = "Use http:// or https:// links.";
            } else if (trimmedUrl) {
                try {
                    new URL(trimmedUrl);
                } catch {
                    urlError = "Enter a valid URL.";
                }
            }
            return (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <TextInput
                        label="URL"
                        value={action.url}
                        placeholder="https://example.com"
                        error={urlError}
                        onChange={value => onChange({ type: "url", url: value, openExternal: action.openExternal })}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Switch
                            checked={Boolean(action.openExternal)}
                            onChange={value => onChange({ type: "url", url: action.url, openExternal: value })}
                        />
                        <Paragraph size="sm">Open externally</Paragraph>
                    </div>
                </div>
            );
        }
        case "macro":
            const invalidSteps = action.steps.filter(step => !getCommandById(step));
            return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <TextInput
                        label="Command Sequence"
                        value={action.steps.join(", ")}
                        placeholder="command-a, command-b"
                        onChange={value => onChange({ type: "macro", steps: parseListInput(value) })}
                    />
                    <Button
                        size="small"
                        onClick={() => openCommandPicker({
                            allowMultiple: true,
                            initialSelectedIds: action.steps,
                            onComplete: (commands, ids) => {
                                const nextIds = ids ?? commands.map(command => command.id);
                                onChange({ type: "macro", steps: nextIds });
                            }
                        })}
                    >
                        Add Step…
                    </Button>
                    {action.steps.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {action.steps.map((step, index) => (
                                <TextButton
                                    key={`${step}-${index}`}
                                    variant="secondary"
                                    onClick={() => {
                                        const next = [...action.steps];
                                        next.splice(index, 1);
                                        onChange({ type: "macro", steps: next });
                                    }}
                                >
                                    {step} ✕
                                </TextButton>
                            ))}
                        </div>
                    )}
                    {invalidSteps.length > 0 && (
                        <Paragraph size="sm" style={{ color: "var(--status-danger-text, #f04747)" }}>
                            Unknown command IDs: {invalidSteps.join(", ")}
                        </Paragraph>
                    )}
                </div>
            );
        default:
            return null;
    }
}

export function CommandPaletteSettingsPanel() {
    const [commands, setCommands] = React.useState<CustomCommandDefinition[]>(() => getCustomCommandsSnapshot());
    const [tagMeta, setTagMeta] = React.useState(() => listAllTags());
    const [categoryOptions, setCategoryOptions] = React.useState(() => buildCategoryOptions());
    const [advancedOpen, setAdvancedOpen] = React.useState<Record<string, boolean>>({});
    const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

    React.useEffect(() => {
        return subscribeCustomCommands(next => setCommands(next));
    }, []);

    React.useEffect(() => {
        setTagMeta(listAllTags());
        setCategoryOptions(buildCategoryOptions());
        return subscribeRegistry(() => {
            setTagMeta(listAllTags());
            setCategoryOptions(buildCategoryOptions());
        });
    }, []);

    const updateCommands = React.useCallback((next: CustomCommandDefinition[]) => {
        setCommands(next);
        void saveCustomCommands(next);
    }, []);

    const handleAdd = () => {
        updateCommands([...commands, createDefaultCommand()]);
    };

    const handleRemove = (id: string) => {
        updateCommands(commands.filter(command => command.id !== id));
    };

    const handleUpdate = (id: string, updater: (command: CustomCommandDefinition) => CustomCommandDefinition) => {
        updateCommands(commands.map(command => (command.id === id ? updater(command) : command)));
    };

    React.useEffect(() => {
        setAdvancedOpen(prev => {
            const next = { ...prev };
            for (const key of Object.keys(next)) {
                if (!commands.some(command => command.id === key)) {
                    delete next[key];
                }
            }
            return next;
        });
        setCollapsed(prev => {
            const next = { ...prev };
            for (const key of Object.keys(next)) {
                if (!commands.some(command => command.id === key)) {
                    delete next[key];
                }
            }
            return next;
        });
    }, [commands]);

    return (
        <section>
            <Heading tag="h4" style={{ color: "var(--text-normal, #dcddde)" }}>Custom Commands</Heading>
            <Paragraph size="sm" className="vc-command-palette-settings-help">
                {/* Hank, don't abbreviate cyberpunk hank */}
                1) Name the command · 2) Add optional description/keywords/tags/category · 3) Choose an action and fill its details (IDs should match existing palette commands for aliases and macros).
            </Paragraph>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {commands.map(command => {
                    const manualAdvanced = advancedOpen[command.id];
                    const hasAdvancedContent = Boolean(command.description?.trim()?.length || (command.keywords?.length ?? 0) || (command.tags?.length ?? 0) || command.categoryId || command.danger);
                    const showAdvanced = manualAdvanced ?? hasAdvancedContent;
                    const categoryId = command.categoryId ?? "";
                    const categoryPath = categoryId ? getCategoryPath(categoryId) : [];
                    const categoryLabel = categoryId
                        ? (categoryPath.length ? categoryPath.map(item => item.label).join(" › ") : categoryId)
                        : "Auto (default)";
                    const isCollapsed = collapsed[command.id] ?? false;

                    return (
                        <div key={command.id} style={{ padding: 14, borderRadius: 8, background: "var(--background-primary)", border: "1px solid var(--background-base-low)", display: "flex", flexDirection: "column", gap: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <Heading tag="h5" style={{ color: "var(--text-normal, #dcddde)", marginBottom: 0 }}>
                                    {command.label || "Untitled Command"}
                                </Heading>
                                <TextButton
                                    variant="secondary"
                                    onClick={() => setCollapsed(prev => ({ ...prev, [command.id]: !isCollapsed }))}
                                >
                                    {isCollapsed ? "Expand" : "Collapse"}
                                </TextButton>
                            </div>

                            {!isCollapsed && (
                                <>
                                    <TextInput
                                        label="Label"
                                        value={command.label}
                                        placeholder="Display name"
                                        onChange={value => handleUpdate(command.id, prev => duplicateWithUpdates(prev, { label: value }))}
                                    />

                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                                            <Select
                                                options={ACTION_OPTIONS}
                                                isSelected={value => value === command.action.type}
                                                select={value => {
                                                    const nextType = value as ActionType;
                                                    switch (nextType) {
                                                        case "command":
                                                            handleUpdate(command.id, prev => TEMPLATE_CONFIGS[0].apply(prev));
                                                            break;
                                                        case "settings":
                                                            handleUpdate(command.id, prev => TEMPLATE_CONFIGS[1].apply(prev));
                                                            break;
                                                        case "url":
                                                            handleUpdate(command.id, prev => TEMPLATE_CONFIGS[2].apply(prev));
                                                            break;
                                                        case "macro":
                                                            handleUpdate(command.id, prev => TEMPLATE_CONFIGS[3].apply(prev));
                                                            break;
                                                        default:
                                                            break;
                                                    }
                                                }}
                                                serialize={option => option.value}
                                            />
                                        </div>
                                        <Paragraph size="xs" style={{ color: "var(--text-muted, #a5a6ab)", fontSize: 12 }}>
                                            {ACTION_HELP_TEXT[command.action.type]}
                                        </Paragraph>
                                    </div>

                                    {renderActionFields(command, action => handleUpdate(command.id, prev => duplicateWithUpdates(prev, { action })))}

                                    <TextButton
                                        variant="secondary"
                                        onClick={() => setAdvancedOpen(prev => ({ ...prev, [command.id]: !(showAdvanced ?? false) }))}
                                    >
                                        {showAdvanced ? "Hide advanced options" : "Show advanced options"}
                                    </TextButton>

                                    {showAdvanced && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 12, background: "var(--background-secondary-alt)", borderRadius: 8, padding: 12 }}>
                                            <TextInput
                                                label="Description"
                                                value={command.description ?? ""}
                                                placeholder="Optional subtitle"
                                                onChange={value => handleUpdate(command.id, prev => duplicateWithUpdates(prev, { description: value }))}
                                            />
                                            <TextInput
                                                label="Keywords"
                                                value={(command.keywords ?? []).join(", ")}
                                                placeholder="Comma-separated keywords"
                                                onChange={value => handleUpdate(command.id, prev => duplicateWithUpdates(prev, { keywords: parseListInput(value) }))}
                                            />
                                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                <TextInput
                                                    label="Tags"
                                                    value={(command.tags ?? []).join(", ")}
                                                    placeholder="Comma-separated tags"
                                                    onChange={value => handleUpdate(command.id, prev => duplicateWithUpdates(prev, { tags: parseListInput(value) }))}
                                                />
                                                {tagMeta.length > 0 && (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                        <Paragraph size="xs" style={{ color: "var(--text-muted, #a5a6ab)", fontSize: 12 }}>
                                                            Suggestions
                                                        </Paragraph>
                                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                                            {tagMeta
                                                                .filter(meta => !(command.tags ?? []).some(tag => normalizeTag(tag) === meta.id))
                                                                .slice(0, 12)
                                                                .map(meta => (
                                                                    <Button
                                                                        key={meta.id}
                                                                        size="min"
                                                                        variant="secondary"
                                                                        onClick={() => handleUpdate(command.id, prev => duplicateWithUpdates(prev, {
                                                                            tags: normalizeTagList([...(prev.tags ?? []), meta.label])
                                                                        }))}
                                                                    >
                                                                        {meta.label}
                                                                    </Button>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                <Select
                                                    options={categoryOptions}
                                                    isSelected={value => value === categoryId}
                                                    select={value => handleUpdate(command.id, prev => duplicateWithUpdates(prev, { categoryId: value || undefined }))}
                                                    serialize={option => option.value}
                                                />
                                                <Paragraph size="xs" style={{ color: "var(--text-muted, #a5a6ab)", fontSize: 12 }}>
                                                    Choose where this command appears in the palette.
                                                </Paragraph>
                                                {categoryId && (
                                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "2px 10px", fontSize: 12, background: "var(--background-base-low)", color: "var(--text-normal, #dcddde)" }}>
                                                            {categoryLabel}
                                                            <span style={{ color: "var(--text-muted, #a5a6ab)" }}>· {categoryId}</span>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <Switch
                                                    checked={Boolean(command.danger)}
                                                    onChange={value => handleUpdate(command.id, prev => duplicateWithUpdates(prev, { danger: value }))}
                                                />
                                                <Paragraph size="sm">Show as dangerous</Paragraph>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <Button
                                variant="dangerPrimary"
                                size="small"
                                onClick={() => handleRemove(command.id)}
                            >
                                Remove Command
                            </Button>
                        </div>
                    );
                })}
            </div>
            <Button variant="primary" style={{ marginTop: 16 }} onClick={handleAdd}>
                Add Command
            </Button>
        </section>
    );
}
