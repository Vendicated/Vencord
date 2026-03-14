/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { classNameFactory } from "@utils/css";
import { React } from "@webpack/common";

import {
    type CustomCommandDefinition,
    getCustomCommandsSnapshot,
    saveCustomCommands,
    subscribeCustomCommands,
    subscribeRegistry } from "../../registry";

const cl = classNameFactory("vc-command-palette-");
import { CustomCommandCard } from "./CustomCommandCard";
import { buildCategoryOptions, createDefaultCommand } from "./helpers";

export function CustomCommandsPanel() {
    const [commands, setCommands] = React.useState<CustomCommandDefinition[]>(() => getCustomCommandsSnapshot());
    const [categoryOptions, setCategoryOptions] = React.useState(() => buildCategoryOptions());
    const [drafts, setDrafts] = React.useState<CustomCommandDefinition[]>([]);
    const [collapsedIds, setCollapsedIds] = React.useState<Set<string>>(() => new Set());

    React.useEffect(() => subscribeCustomCommands(setCommands), []);

    React.useEffect(() => {
        setCategoryOptions(buildCategoryOptions());
        return subscribeRegistry(() => {
            setCategoryOptions(buildCategoryOptions());
        });
    }, []);

    const persist = React.useCallback((next: CustomCommandDefinition[]) => {
        setCommands(next);
        void saveCustomCommands(next);
    }, []);

    const addDraft = React.useCallback(() => {
        setDrafts(current => [...current, createDefaultCommand()]);
    }, []);

    const commitExisting = React.useCallback((nextCommand: CustomCommandDefinition) => {
        const next = commands.map(command => (command.id === nextCommand.id ? nextCommand : command));
        persist(next);
        setCollapsedIds(current => {
            const nextCollapsed = new Set(current);
            nextCollapsed.add(nextCommand.id);
            return nextCollapsed;
        });
    }, [commands, persist]);

    const removeExisting = React.useCallback((id: string) => {
        persist(commands.filter(command => command.id !== id));
    }, [commands, persist]);

    const commitDraft = React.useCallback((nextCommand: CustomCommandDefinition) => {
        const existingIds = new Set(commands.map(command => command.id));
        let finalCommand = nextCommand;

        if (existingIds.has(finalCommand.id)) {
            finalCommand = {
                ...finalCommand,
                id: `custom-${Math.random().toString(36).slice(2, 8)}`
            };
        }

        persist([...commands, finalCommand]);
        setDrafts(current => current.filter(command => command.id !== nextCommand.id));
        setCollapsedIds(current => {
            const nextCollapsed = new Set(current);
            nextCollapsed.add(finalCommand.id);
            return nextCollapsed;
        });
    }, [commands, persist]);

    const discardDraft = React.useCallback((id: string) => {
        setDrafts(current => current.filter(command => command.id !== id));
    }, []);

    return (
        <section>
            <Heading tag="h4" style={{ color: "var(--text-normal, #dcddde)" }}>Custom Commands</Heading>
            <Paragraph size="sm" className={cl("settings-help")}>
                Build commands in three simple steps: Basics, Action, and Review. Advanced options stay hidden unless you need them.
            </Paragraph>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {commands.map(command => (
                    <CustomCommandCard
                        key={command.id}
                        command={command}
                        startCollapsed={collapsedIds.has(command.id)}
                        categoryOptions={categoryOptions}
                        onCommit={commitExisting}
                        onRemove={() => removeExisting(command.id)}
                    />
                ))}

                {drafts.map(command => (
                    <CustomCommandCard
                        key={command.id}
                        command={command}
                        isNew
                        categoryOptions={categoryOptions}
                        onCommit={commitDraft}
                        onRemove={() => discardDraft(command.id)}
                    />
                ))}
            </div>

            {drafts.length === 0 && (
                <Button variant="primary" style={{ marginTop: 16 }} onClick={addDraft}>
                    Add Command
                </Button>
            )}
        </section>
    );
}
