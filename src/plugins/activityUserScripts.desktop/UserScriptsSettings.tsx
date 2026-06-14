/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { CodeBlock } from "@components/CodeBlock";
import { Flex } from "@components/Flex";
import { DeleteIcon, PencilIcon } from "@components/Icons";
import { Margins } from "@components/margins";
import { Paragraph } from "@components/Paragraph";
import { Switch } from "@components/Switch";
import { classNameFactory } from "@utils/css";
import type { PluginNative } from "@utils/types";
import { ConfirmModal, Forms, Modal, openModal, showToast, Text, TextInput, Toasts, useEffect, useState } from "@webpack/common";

import { getScripts, loadScripts, removeScript, saveScript, settings } from "./settings";
import { ActivityUserScript, createUserScript, getScriptDisplayName, getScriptEnabled, parseActivityIds, refreshUserScriptMetadata, RunAt, setScriptEnabled } from "./shared";

const Native = VencordNative.pluginHelpers.ActivityUserScripts as PluginNative<typeof import("./native")>;
const cl = classNameFactory("vc-activityUserScripts-");
const RunAtOptions = [RunAt.DocumentStart, RunAt.DocumentEnd, RunAt.DocumentIdle];
let setScriptsState: ((scripts: Record<string, ActivityUserScript>) => void) | null = null;

function replaceScript(script: ActivityUserScript) {
    const scripts = saveScript(script);
    setScriptsState?.(scripts);
    syncNativeScripts(scripts);
}

function deleteScript(id: string) {
    const scripts = removeScript(id);
    setScriptsState?.(scripts);
    syncNativeScripts(scripts);
}

function syncNativeScripts(scripts: Record<string, ActivityUserScript>) {
    Native?.syncScripts?.(scripts)?.catch(() => null);
}

function openTrustModal(options: {
    title: string;
    subtitle: string;
    sourceUrl: string;
    code: string;
    confirmText: string;
    onConfirm(): void;
}) {
    openModal(props => (
        <ConfirmModal
            {...props}
            title={options.title}
            subtitle={options.subtitle}
            confirmText={options.confirmText}
            cancelText="Cancel"
            variant="primary"
            onConfirm={options.onConfirm}
        >
            <Flex flexDirection="column" gap={12}>
                <Text variant="text-sm/normal">
                    Source: {options.sourceUrl}
                </Text>
                <CodeBlock content={options.code} lang="javascript" />
            </Flex>
        </ConfirmModal>
    ));
}

function openDeleteModal(script: ActivityUserScript) {
    openModal(props => (
        <ConfirmModal
            {...props}
            title="Delete UserScript?"
            subtitle={`Delete "${getScriptDisplayName(script)}"? This cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={() => deleteScript(script.id)}
        />
    ));
}

function openImportModal(onImport: (script: ActivityUserScript) => void) {
    openModal(props => <ImportModal {...props} onImport={onImport} />);
}

function ImportModal(props: any & { onImport(script: ActivityUserScript): void; }) {
    const [url, setUrl] = useState("");
    const [isFetching, setIsFetching] = useState(false);

    async function importUrl() {
        setIsFetching(true);
        const result = await Native.fetchUserScript(url);
        setIsFetching(false);

        if (!result.ok) {
            showToast(`Failed to import UserScript: ${result.error}`, Toasts.Type.FAILURE);
            return;
        }

        props.onClose();
        openTrustModal({
            title: "Trust imported UserScript?",
            subtitle: "Only import scripts from sources you trust. Activity UserScripts can read and modify matching Activity frames.",
            sourceUrl: url,
            code: result.value,
            confirmText: "Import",
            onConfirm: () => {
                props.onImport(createUserScript(result.value, url));
            },
        });
    }

    return (
        <Modal
            {...props}
            title="Import UserScript from URL"
            subtitle="Fetch a UserScript and review it before enabling."
            actions={[
                {
                    text: "Cancel",
                    variant: "secondary",
                    onClick: props.onClose,
                },
                {
                    text: isFetching ? "Importing..." : "Import",
                    variant: "primary",
                    disabled: isFetching || !/^https?:\/\/.+/i.test(url),
                    onClick: importUrl,
                },
            ]}
        >
            <Flex flexDirection="column" gap={8}>
                <Forms.FormTitle tag="h3">URL</Forms.FormTitle>
                <TextInput value={url} onChange={setUrl} placeholder="https://example.com/script.user.js" />
            </Flex>
        </Modal>
    );
}

function ScriptRow({ script, onEdit }: { script: ActivityUserScript; onEdit(script: ActivityUserScript): void; }) {
    const [enabled, setEnabled] = useState(getScriptEnabled(script));
    const displayName = getScriptDisplayName(script);
    const activities = script.activityIds.length
        ? script.activityIds.map(id => `${id}.discordsays.com`).join(", ")
        : "No Activity IDs";

    function updateScriptEnabled(nextEnabled: boolean) {
        setEnabled(nextEnabled);
        replaceScript(setScriptEnabled(script, nextEnabled));
    }

    return (
        <Card className={cl("card")}>
            <Flex className={cl("row")} alignItems="center" gap={12}>
                <Switch
                    checked={enabled}
                    onChange={updateScriptEnabled}
                />
                <div className={cl("rowInfo")}>
                    <Text variant="text-md/semibold">{displayName}</Text>
                    <Text variant="text-xs/normal" color="text-muted">{activities}</Text>
                </div>
                <Button variant="secondary" size="iconOnly" onClick={() => onEdit(script)}>
                    <PencilIcon aria-label="Edit UserScript" width={20} height={20} />
                </Button>
                <Button variant="dangerSecondary" size="iconOnly" onClick={() => openDeleteModal(script)}>
                    <DeleteIcon aria-label="Delete UserScript" width={20} height={20} />
                </Button>
            </Flex>
        </Card>
    );
}

function ScriptEditor({ script: initialScript, onBack }: { script: ActivityUserScript; onBack(): void; }) {
    const [script, setScript] = useState(initialScript);
    const [newActivityId, setNewActivityId] = useState("");
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    const displayMetadata = script.metadata;

    function update(next: ActivityUserScript) {
        setScript(next);
        replaceScript(next);
    }

    function updateCode(code: string) {
        update(refreshUserScriptMetadata(script, code));
    }

    function openCodeEditor() {
        Native.openEditor(script.id, script.code, `Vencord UserScript Editor - ${getScriptDisplayName(script)}`).catch(error => {
            showToast(`Failed to open editor: ${error instanceof Error ? error.message : String(error)}`, Toasts.Type.FAILURE);
        });
    }

    function addActivityId() {
        const [activityId] = parseActivityIds([newActivityId]);
        if (!activityId) return;

        setNewActivityId("");
        if (script.activityIds.includes(activityId)) return;

        update({ ...script, activityIds: [...script.activityIds, activityId] });
    }

    function removeActivityId(activityId: string) {
        update({ ...script, activityIds: script.activityIds.filter(id => id !== activityId) });
    }

    function updateActivityId(index: number, value: string) {
        const nextActivityIds = [...script.activityIds];
        nextActivityIds[index] = value.trim();
        update({ ...script, activityIds: nextActivityIds });
    }

    function normalizeActivityId(index: number) {
        const value = script.activityIds[index];
        const [activityId] = parseActivityIds([value]);

        if (!activityId) {
            update({ ...script, activityIds: script.activityIds.filter((_, i) => i !== index) });
            return;
        }

        const nextActivityIds = script.activityIds
            .map((id, i) => i === index ? activityId : id)
            .filter((id, i, ids) => ids.indexOf(id) === i);

        update({ ...script, activityIds: nextActivityIds });
    }

    async function checkForUpdate() {
        if (!script.sourceUrl) return;

        setIsCheckingUpdate(true);
        const result = await Native.fetchUserScript(script.sourceUrl);
        setIsCheckingUpdate(false);

        if (!result.ok) {
            showToast(`Failed to check for updates: ${result.error}`, Toasts.Type.FAILURE);
            return;
        }

        if (result.value === (script.lastImportedCode ?? script.code)) {
            showToast("UserScript is already up to date.", Toasts.Type.SUCCESS);
            return;
        }

        openTrustModal({
            title: "Apply UserScript update?",
            subtitle: "Review the updated script before applying it.",
            sourceUrl: script.sourceUrl,
            code: result.value,
            confirmText: "Apply Update",
            onConfirm: () => {
                const nextScript = {
                    ...refreshUserScriptMetadata(script, result.value),
                    lastImportedCode: result.value,
                };
                update(nextScript);
            },
        });
    }

    useEffect(() => {
        return VencordNative.monaco.addContentChangeListener((scriptId, code) => {
            if (scriptId === script.id) updateCode(code);
        });
    }, [script]);

    return (
        <section className={cl("root")}>
            <Flex justifyContent="space-between" alignItems="center" className={Margins.bottom16}>
                <div>
                    <Forms.FormTitle tag="h2">{getScriptDisplayName(script)}</Forms.FormTitle>
                    <Forms.FormText>Edit Activity UserScript settings and code.</Forms.FormText>
                </div>
                <Button variant="secondary" onClick={onBack}>Back</Button>
            </Flex>

            <Flex flexDirection="column" gap={16}>
                <Card>
                    <Flex flexDirection="column" gap={12}>
                        <label className={cl("switchLine")}>
                            <Switch checked={getScriptEnabled(script)} onChange={(enabled: boolean) => update(setScriptEnabled(script, enabled))} />
                            <span>Enable UserScript</span>
                        </label>
                        <label className={cl("switchLine")}>
                            <Switch checked={script.notifyOnRun !== false} onChange={(notifyOnRun: boolean) => update({ ...script, notifyOnRun })} />
                            <span>Display notification upon execution</span>
                        </label>
                        {script.sourceUrl && (
                            <Button variant="secondary" onClick={checkForUpdate} disabled={isCheckingUpdate}>
                                {isCheckingUpdate ? "Checking for updates..." : "Check for updates"}
                            </Button>
                        )}
                    </Flex>
                </Card>

                <section>
                    <Forms.FormTitle tag="h3">Name</Forms.FormTitle>
                    <TextInput
                        value={script.names[0] ?? ""}
                        onChange={(value: string) => update({ ...script, names: value.trim() ? [value] : [] })}
                        placeholder="Activity helper"
                    />
                </section>

                <section>
                    <Forms.FormTitle tag="h3">Triggering Activity IDs</Forms.FormTitle>
                    <Forms.FormText className={Margins.bottom8}>Scripts run only on matching [ID].discordsays.com frames.</Forms.FormText>
                    <Flex flexDirection="column" gap={8} className={Margins.bottom8}>
                        {script.activityIds.map((activityId, index) => (
                            <Flex alignItems="center" gap={8} key={index}>
                                <TextInput
                                    value={activityId}
                                    onChange={(value: string) => updateActivityId(index, value)}
                                    onBlur={() => normalizeActivityId(index)}
                                    onKeyDown={event => {
                                        if (event.key === "Enter") normalizeActivityId(index);
                                    }}
                                />
                                <Button size="iconOnly" variant="dangerSecondary" onClick={() => removeActivityId(activityId)}>
                                    <DeleteIcon aria-label="Delete" width={20} height={20} />
                                </Button>
                            </Flex>
                        ))}
                    </Flex>
                    <Flex gap={8} alignItems="center">
                        <TextInput
                            value={newActivityId}
                            onChange={setNewActivityId}
                            onKeyDown={event => {
                                if (event.key === "Enter") addActivityId();
                            }}
                        />
                        <Button variant="secondary" onClick={addActivityId}>Add</Button>
                    </Flex>
                </section>

                <section>
                    <Forms.FormTitle tag="h3">Run At</Forms.FormTitle>
                    <div className={cl("runAtGrid")}>
                        {RunAtOptions.map(runAt => (
                            <Button
                                key={runAt}
                                variant={script.runAt === runAt ? "primary" : "secondary"}
                                onClick={() => update({ ...script, runAt })}
                            >
                                {runAt}
                            </Button>
                        ))}
                    </div>
                </section>

                {(displayMetadata.version || displayMetadata.description || displayMetadata.author || displayMetadata.requires.length > 0) && (
                    <Card variant="info">
                        <Flex flexDirection="column" gap={4}>
                            {displayMetadata.version && <Paragraph>Version: {displayMetadata.version}</Paragraph>}
                            {displayMetadata.description && <Paragraph>Description: {displayMetadata.description}</Paragraph>}
                            {displayMetadata.author && <Paragraph>Author: {displayMetadata.author}</Paragraph>}
                            {displayMetadata.requires.length > 0 && <Paragraph>Requires: {displayMetadata.requires.length} URL{displayMetadata.requires.length === 1 ? "" : "s"}</Paragraph>}
                        </Flex>
                    </Card>
                )}

                <section>
                    <Forms.FormTitle tag="h3">Code</Forms.FormTitle>
                    <Flex className={Margins.top8} gap={8} alignItems="center">
                        <Button variant="secondary" onClick={openCodeEditor}>Open Code Editor</Button>
                        <Text variant="text-sm/normal" color="text-muted">
                            {script.code.trim() ? `${script.code.length} characters` : "No code"}
                        </Text>
                    </Flex>
                </section>
            </Flex>
        </section>
    );
}

export function UserScriptsSettings() {
    settings.use(["scriptsComponent"]);

    const [scripts, setScripts] = useState(getScripts());
    const [editingId, setEditingId] = useState<string | null>(null);
    const scriptsList = Object.values(scripts);
    const editingScript = editingId ? scripts[editingId] : null;

    setScriptsState = setScripts;

    useEffect(() => {
        loadScripts().then(loadedScripts => {
            setScripts(loadedScripts);
            syncNativeScripts(loadedScripts);
        });
    }, []);

    function editScript(script: ActivityUserScript) {
        setEditingId(script.id);
    }

    function addScript() {
        const script = createUserScript();
        replaceScript(script);
        editScript(script);
    }

    if (editingScript) {
        return <ScriptEditor script={editingScript} onBack={() => setEditingId(null)} />;
    }

    return (
        <section className={cl("root")}>
            <Flex gap={8} flexWrap="wrap" className={Margins.bottom16}>
                <Button onClick={addScript}>Add UserScript</Button>
                <Button variant="secondary" onClick={() => openImportModal(script => {
                    replaceScript(script);
                    editScript(script);
                })}
                >
                    Import from URL
                </Button>
            </Flex>

            <Flex flexDirection="column" gap={8}>
                {scriptsList.length
                    ? scriptsList.map(script => <ScriptRow key={script.id} script={script} onEdit={editScript} />)
                    : (
                        <Card>
                            <Forms.FormText>No Activity UserScripts have been added.</Forms.FormText>
                        </Card>
                    )}
            </Flex>
        </section>
    );
}
