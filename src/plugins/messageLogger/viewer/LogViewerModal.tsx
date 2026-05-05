/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { purgeMatching } from "@plugins/messageLogger/persistence";
import { classNameFactory } from "@utils/css";
import { Logger } from "@utils/Logger";
import { closeModal, ModalCloseButton, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Alerts, Button, Forms, GuildStore, ListScrollerThin, Select, TabBar, Text, TextInput, useMemo, useState } from "@webpack/common";

import { LogEntryRow } from "./LogEntryRow";
import { useLogEntries, ViewerScope } from "./useLogEntries";

const logger = new Logger("MessageLogger");
const cl = classNameFactory("vc-ml-viewer-");

type Tab = "deleted" | "edited" | "all";
type Sort = "newest" | "oldest";

interface ViewerProps {
    modalProps: ModalProps;
    initialScope: ViewerScope;
    channelId?: string;
    guildId?: string;
    rowDensity: "compact" | "comfortable";
    close(): void;
}

function getScopeLabel(scope: ViewerScope, channelId?: string, guildId?: string): string {
    if (scope === "channel" && channelId) return "this channel";
    if (scope === "guild" && guildId) {
        const g = GuildStore.getGuild(guildId);
        return g ? `server "${g.name}"` : "this server";
    }
    return "everywhere";
}

function ViewerInner(props: ViewerProps) {
    const { modalProps, initialScope, channelId, guildId, rowDensity, close } = props;

    const [scope, setScope] = useState<ViewerScope>(initialScope);
    const [tab, setTab] = useState<Tab>(initialScope === "global" ? "all" : "deleted");
    const [search, setSearch] = useState("");
    const [authorFilter, setAuthorFilter] = useState<string | null>(null);
    const [sort, setSort] = useState<Sort>("newest");

    const baseEntries = useLogEntries({ scope, channelId, guildId });

    const tabFiltered = useMemo(() => {
        switch (tab) {
            case "deleted": return baseEntries.filter(e => e.deleted);
            case "edited": return baseEntries.filter(e => !e.deleted && (e.editHistory?.length ?? 0) > 0);
            default: return baseEntries;
        }
    }, [baseEntries, tab]);

    const authorOptions = useMemo(() => {
        const seen = new Map<string, string>();
        for (const e of tabFiltered) {
            const a = (e.message as any).author;
            if (a?.id && !seen.has(a.id)) {
                seen.set(a.id, a.global_name || a.username || a.id);
            }
        }
        return [...seen.entries()].map(([id, label]) => ({ value: id, label }));
    }, [tabFiltered]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        let out = tabFiltered;
        if (q) {
            out = out.filter(e => {
                const m = e.message as any;
                const content = (m.content ?? "").toLowerCase();
                const username = (m.author?.username ?? "").toLowerCase();
                const globalName = (m.author?.global_name ?? "").toLowerCase();
                return content.includes(q) || username.includes(q) || globalName.includes(q);
            });
        }
        if (authorFilter) out = out.filter(e => (e.message as any).author?.id === authorFilter);
        out = [...out].sort((a, b) => sort === "newest" ? b.capturedAt - a.capturedAt : a.capturedAt - b.capturedAt);
        return out;
    }, [tabFiltered, search, authorFilter, sort]);

    const rowHeight = rowDensity === "comfortable" ? 88 : 64;
    const scopeLabel = getScopeLabel(scope, channelId, guildId);

    function clearVisible() {
        const visibleIds = new Set(visible.map(e => e.id));
        const count = visibleIds.size;
        if (count === 0) return;

        const filterParts: string[] = [];
        if (tab !== "all") filterParts.push(`tab "${tab}"`);
        if (search.trim()) filterParts.push(`matching "${search.trim()}"`);
        if (authorFilter) filterParts.push("from selected author");
        const filterText = filterParts.length ? ` (${filterParts.join(", ")})` : "";

        Alerts.show({
            title: "Clear visible entries?",
            body: `This will permanently remove ${count} message${count === 1 ? "" : "s"} from ${scopeLabel}${filterText}. This cannot be undone.`,
            confirmText: "Clear",
            confirmColor: "vc-ml-viewer-danger-btn",
            cancelText: "Cancel",
            async onConfirm() {
                try {
                    await purgeMatching(e => visibleIds.has(e.id));
                } catch (e) {
                    logger.error("Failed to clear visible entries", e);
                    Alerts.show({ title: "Failed", body: "Could not clear log; see console.", confirmText: "OK" });
                }
            },
        });
    }

    const scopeDropdownOptions: { value: ViewerScope; label: string; }[] = [];
    if (initialScope === "channel" && channelId) scopeDropdownOptions.push({ value: "channel", label: "This channel" });
    if ((initialScope === "channel" || initialScope === "guild") && guildId) scopeDropdownOptions.push({ value: "guild", label: "This server" });
    scopeDropdownOptions.push({ value: "global", label: "Everywhere" });

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>
                    Message Log — {scopeLabel}
                </Text>
                <ModalCloseButton onClick={close} />
            </ModalHeader>

            <TabBar
                type="top"
                look="brand"
                selectedItem={tab}
                onItemSelect={(v: Tab) => setTab(v)}
                style={{ padding: "0 16px" }}
            >
                <TabBar.Item id="deleted">Deleted</TabBar.Item>
                <TabBar.Item id="edited">Edited</TabBar.Item>
                <TabBar.Item id="all">All</TabBar.Item>
            </TabBar>

            <div style={{ display: "flex", gap: 8, padding: 12, alignItems: "center", flexWrap: "wrap" }}>
                <TextInput
                    value={search}
                    onChange={setSearch}
                    placeholder="search content or author..."
                    style={{ flex: "1 1 240px", minWidth: 200 }}
                />
                {scopeDropdownOptions.length > 1 && (
                    <div style={{ minWidth: 140 }}>
                        <Select
                            options={scopeDropdownOptions}
                            select={(v: ViewerScope) => setScope(v)}
                            isSelected={(v: ViewerScope) => v === scope}
                            serialize={String}
                            placeholder="Scope"
                        />
                    </div>
                )}
                <div style={{ minWidth: 140 }}>
                    <Select
                        options={[{ value: null, label: "Any author" }, ...authorOptions]}
                        select={v => setAuthorFilter(v as string | null)}
                        isSelected={v => v === authorFilter}
                        serialize={String}
                        placeholder="Author"
                    />
                </div>
                <div style={{ minWidth: 140 }}>
                    <Select
                        options={[{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }]}
                        select={(v: Sort) => setSort(v)}
                        isSelected={(v: Sort) => v === sort}
                        serialize={String}
                    />
                </div>
            </div>

            <div className={cl("list-wrapper")} style={{ flex: 1, minHeight: 360, display: "flex", flexDirection: "column" }}>
                {visible.length === 0 ? (
                    <div style={{ padding: 32, textAlign: "center" }}>
                        <Forms.FormText>
                            {baseEntries.length === 0 ? "No messages logged yet." : "No matches found."}
                        </Forms.FormText>
                    </div>
                ) : (
                    <ListScrollerThin
                        sections={[visible.length]}
                        sectionHeight={0}
                        rowHeight={rowHeight}
                        renderSection={() => null}
                        renderRow={(item: { row: number; }) => (
                            <LogEntryRow key={visible[item.row].id} entry={visible[item.row]} density={rowDensity} />
                        )}
                    />
                )}
            </div>

            <ModalFooter>
                <div style={{ display: "flex", gap: 8, width: "100%", justifyContent: "space-between" }}>
                    <Button
                        color={Button.Colors.RED}
                        disabled={visible.length === 0}
                        onClick={clearVisible}
                    >
                        Clear log (visible entries)
                    </Button>
                    <Button onClick={close}>Close</Button>
                </div>
            </ModalFooter>
        </ModalRoot>
    );
}

export interface OpenLogViewerArgs {
    scope: ViewerScope;
    channelId?: string;
    guildId?: string;
    rowDensity?: "compact" | "comfortable";
}

export function openLogViewerModal(args: OpenLogViewerArgs): void {
    const key = openModal(modalProps => (
        <ErrorBoundary>
            <ViewerInner
                modalProps={modalProps}
                initialScope={args.scope}
                channelId={args.channelId}
                guildId={args.guildId}
                rowDensity={args.rowDensity ?? "compact"}
                close={() => closeModal(key)}
            />
        </ErrorBoundary>
    ));
}
