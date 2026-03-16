/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CogWheel, ColorPaletteIcon, CopyIcon, FolderIcon, LinkIcon, MagnifyingGlassIcon, MainSettingsIcon, Microphone, NotesIcon, OpenExternalIcon, PluginIcon, RestartIcon, SafetyIcon, UpdaterIcon, WarningIcon } from "@components/Icons";
import { classNameFactory } from "@utils/css";
import { classes } from "@utils/misc";
import type { JSX } from "react";

import type { PaletteCandidate } from "./types";

const cl = classNameFactory("vc-command-palette-");

type IconProps = JSX.IntrinsicElements["svg"];

function BellDismiss(props: IconProps) {
    return (
        <svg
            {...props}
            className={classes(props.className, "vc-bell-dismiss")}
            role="img"
            viewBox="0 0 24 24"
        >
            <path
                fill="currentColor"
                d="M12 2a6 6 0 0 0-6 6v3.7c0 .72-.25 1.42-.72 1.97L3.4 15.87A1 1 0 0 0 4.17 17h10.84l-1.9-1.9H6.44l.36-.42A4.98 4.98 0 0 0 8 11.7V8a4 4 0 0 1 7.8-1.26 1 1 0 1 0 1.9-.62A6 6 0 0 0 12 2Zm0 20a3 3 0 0 0 2.82-2H9.18A3 3 0 0 0 12 22Z"
            />
            <path
                fill="currentColor"
                d="M19.78 21.2 2.8 4.22l1.42-1.42L21.2 19.78l-1.42 1.42Z"
            />
        </svg>
    );
}

interface CommandPaletteRowProps {
    item: PaletteCandidate;
    selected: boolean;
    onClick(): void;
    onDoubleClick?(): void;
    onHover(): void;
}

export function CommandPaletteRow({ item, selected, onClick, onDoubleClick, onHover }: CommandPaletteRowProps) {
    const resolveQueryIcon = () => {
        if (item.type !== "query") return CogWheel;
        if (item.query.icon) return item.query.icon;

        const text = `${item.query.label} ${item.query.description ?? ""}`.toLowerCase();
        if (text.includes("send message")) return NotesIcon;
        if (text.includes("open dm")) return NotesIcon;
        if (text.includes("go to")) return MagnifyingGlassIcon;
        if (text.includes("open settings")) return MainSettingsIcon;
        if (text.includes("toggle plugin")) return PluginIcon;
        if (text.includes("open url")) return OpenExternalIcon;
        if (text.includes("invalid") || text.includes("no matching")) return WarningIcon;
        return CogWheel;
    };

    const resolveCommandIcon = () => {
        if (item.type !== "command") return CogWheel;
        if (item.command.icon) return item.command.icon;
        if (item.icon) return item.icon;

        const category = item.command.categoryId?.toLowerCase() ?? "";
        const metadata = `${item.command.id} ${item.command.label} ${(item.command.keywords ?? []).join(" ")}`.toLowerCase();

        if (category.includes("plugin") || metadata.includes("plugin")) return PluginIcon;
        if (category.includes("discord-settings") || metadata.includes("settings")) return MainSettingsIcon;
        if (metadata.includes("update") || metadata.includes("changelog")) return UpdaterIcon;
        if (metadata.includes("reload") || metadata.includes("restart")) return RestartIcon;
        if ((metadata.includes("notification") || metadata.includes("equicord"))
            && metadata.includes("mute")
            && !metadata.includes("voice")
            && !metadata.includes("deafen")
            && !metadata.includes("microphone")
            && !metadata.includes("mic")) return BellDismiss;
        if (metadata.includes("mute")
            && (metadata.includes("channel") || metadata.includes("guild") || metadata.includes("server")))
            return BellDismiss;
        if (metadata.includes("voice") || metadata.includes("mute") || metadata.includes("deafen")) return Microphone;
        if (metadata.includes("copy")) return CopyIcon;
        if (metadata.includes("link")) return LinkIcon;
        if (metadata.includes("browser") || metadata.includes("external") || metadata.includes("url")) return OpenExternalIcon;
        if (metadata.includes("theme") || metadata.includes("appearance") || metadata.includes("css") || metadata.includes("transparency")) return ColorPaletteIcon;
        if (metadata.includes("privacy") || metadata.includes("safety")) return SafetyIcon;
        if (metadata.includes("dm") || metadata.includes("message") || metadata.includes("chat")) return NotesIcon;
        if (metadata.includes("guild") || metadata.includes("server") || metadata.includes("channel")) return FolderIcon;
        if (metadata.includes("open") || metadata.includes("go to") || metadata.includes("navigate")) return MagnifyingGlassIcon;

        return CogWheel;
    };

    if (item.type === "section") {
        return <div className={cl("section-label")}>{item.label}</div>;
    }

    if (item.type === "query") {
        const Icon = resolveQueryIcon();
        const hasInputPreview = Boolean(item.query.inputPreview?.length);
        return (
            <button
                type="button"
                className={classes(cl("row"), selected && cl("row-selected"))}
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                onMouseEnter={onHover}
            >
                <div className={cl("row-icon")}>
                    <Icon size="18" />
                </div>
                <div className={cl("row-content")}>
                    <div className={classes(cl("row-title"), cl("query-title"))}>
                        <span className={cl("query-prefix")}>{item.query.label}</span>
                        {hasInputPreview && (
                            <span className={cl("query-field")} title={item.query.inputPreview}>
                                {item.query.inputPreview}
                            </span>
                        )}
                    </div>
                    {item.query.description && <div className={cl("row-subtitle")}>{item.query.description}</div>}
                </div>
                <div className={cl("row-meta")}>{item.query.badge}</div>
            </button>
        );
    }

    const Icon = resolveCommandIcon();
    const hasDescription = item.command.description || item.subtitle;

    return (
        <button
            type="button"
            className={classes(cl("row"), selected && cl("row-selected"))}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onMouseEnter={onHover}
        >
            <div className={cl("row-icon")}>
                <Icon size="18" />
            </div>
            <div className={cl("row-content")}>
                <div className={cl("row-title")}>{item.command.label}</div>
                {hasDescription && (
                    <div className={cl("row-subtitle")}>
                        {item.command.description || item.subtitle}
                    </div>
                )}
            </div>
            <div className={cl("row-meta")}>{item.badge}</div>
        </button>
    );
}
