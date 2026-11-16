/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DownArrow, PlusIcon, SearchIcon } from "@components/Icons";
import { addFiles, LibraryKind } from "@plugins/soundPanel.desktop/data/library";
import { glassOpacity, settings } from "@plugins/soundPanel.desktop/settings";
import { showError } from "@plugins/soundPanel.desktop/utils/logger";
import { classNameFactory } from "@utils/css";
import { classes } from "@utils/misc";
import { showToast, useState } from "@webpack/common";
import type { CSSProperties, ReactNode } from "react";

import { UploadIcon } from "./icons";

export const cl = classNameFactory("vc-soundpanel-");

export function useGlassMenu() {
    const { transparency } = settings.use(["transparency"]);

    return {
        className: cl("menu", { solid: transparency === 0 }),
        style: { "--vc-soundpanel-opacity": glassOpacity(transparency) } as CSSProperties
    };
}

async function importFiles(files: File[], kind: LibraryKind) {
    if (!files.length) return;

    try {
        const { added, skipped } = await addFiles(files, kind);
        const target = kind === "music" ? "Music" : "My Sounds";

        if (added) showToast({ text: `Added ${added} file${added === 1 ? "" : "s"} to ${target}`, variant: "success" });
        if (skipped) showToast({ text: `Skipped ${skipped} file${skipped === 1 ? "" : "s"} that ${skipped === 1 ? "isn't" : "aren't"} audio`, variant: "critical" });
    } catch (err) {
        showError("Couldn't save the files", err);
    }
}

function pickFiles(kind: LibraryKind) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*";
    input.multiple = true;
    input.onchange = () => void importFiles([...input.files ?? []], kind);
    input.click();
}

export function UploadButton({ kind, label }: { kind: LibraryKind; label: string; }) {
    return (
        <button type="button" className={cl("action-button")} onClick={() => pickFiles(kind)}>
            <PlusIcon width={16} height={16} />
            <span>{label}</span>
        </button>
    );
}

export function FileDropZone({ kind, children }: { kind: LibraryKind; children: ReactNode; }) {
    const [dragging, setDragging] = useState(false);
    const hasFiles = (e: React.DragEvent) => e.dataTransfer.types.includes("Files");

    return (
        <div
            className={cl("dropzone")}
            onDragOver={e => {
                if (!hasFiles(e)) return;
                e.preventDefault();
                setDragging(true);
            }}
            onDragLeave={e => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={e => {
                if (!hasFiles(e)) return;
                e.preventDefault();
                setDragging(false);
                void importFiles([...e.dataTransfer.files], kind);
            }}
        >
            {children}
            {dragging && (
                <div className={cl("dropzone-overlay")}>
                    <UploadIcon size={28} />
                    <span>Drop audio files to add them to {kind === "music" ? "Music" : "My Sounds"}</span>
                </div>
            )}
        </div>
    );
}

export function SearchBox({ value, placeholder, onChange }: { value: string; placeholder: string; onChange(value: string): void; }) {
    return (
        <label className={cl("search")}>
            <SearchIcon width={16} height={16} />
            <input
                type="text"
                value={value}
                placeholder={placeholder}
                spellCheck={false}
                onChange={e => onChange(e.currentTarget.value)}
                onKeyDown={e => {
                    if (e.key !== "Escape" || !value) return;
                    e.stopPropagation();
                    onChange("");
                }}
            />
        </label>
    );
}

interface RangeSliderProps {
    value: number;
    min?: number;
    max?: number;
    step?: number;
    label: string;
    className?: string;
    onChange(value: number): void;
}

export function RangeSlider({ value, min = 0, max = 100, step = 1, label, className, onChange }: RangeSliderProps) {
    const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;

    return (
        <input
            type="range"
            className={classes(cl("range"), className)}
            min={min}
            max={max}
            step={step}
            value={value}
            aria-label={label}
            style={{ "--vc-soundpanel-fill": `${fill}%` } as CSSProperties}
            onChange={e => onChange(Number(e.currentTarget.value))}
        />
    );
}

export function RenameInput({ initialValue, onDone }: { initialValue: string; onDone(value: string | null): void; }) {
    const [value, setValue] = useState(initialValue);
    const commit = () => onDone(value.trim() || null);

    return (
        <input
            className={cl("rename-input")}
            value={value}
            autoFocus
            maxLength={100}
            onFocus={e => e.currentTarget.select()}
            onChange={e => setValue(e.currentTarget.value)}
            onClick={e => e.stopPropagation()}
            onBlur={commit}
            onKeyDown={e => {
                e.stopPropagation();
                if (e.key === "Enter") commit();
                else if (e.key === "Escape") onDone(null);
            }}
        />
    );
}

export function useCollapsedGroups() {
    const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

    const toggle = (id: string) => setCollapsed(prev => {
        const next = new Set(prev);
        if (!next.delete(id)) next.add(id);
        return next;
    });

    return [collapsed, toggle] as const;
}

export function GroupHeader({ icon, name, badge, count, collapsed, onToggle }: {
    icon: ReactNode;
    name: string;
    badge?: ReactNode;
    count: number;
    collapsed: boolean;
    onToggle(): void;
}) {
    return (
        <button type="button" className={cl("group-header")} onClick={onToggle} aria-expanded={!collapsed}>
            {icon}
            <span className={cl("group-name")}>{name}</span>
            {badge}
            <span className={cl("group-count")}>{count}</span>
            <span className={cl("chevron", { "chevron-collapsed": collapsed })}><DownArrow width={16} height={16} /></span>
        </button>
    );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode; }) {
    return (
        <div className={cl("empty")}>
            <div className={cl("empty-icon")}>{icon}</div>
            <div className={cl("empty-title")}>{title}</div>
            {children && <div className={cl("empty-body")}>{children}</div>}
        </div>
    );
}

export function matchesQuery(name: string, query: string) {
    return name.toLowerCase().includes(query.trim().toLowerCase());
}

export function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

    const total = Math.floor(seconds);
    return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}
