/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ThemeActivationMode } from "@api/Settings";
import { Flex } from "@components/Flex";
import { CogWheel, DeleteIcon, FolderIcon } from "@components/Icons";
import { Link } from "@components/Link";
import { OnlineThemeCard } from "@components/settings/OnlineThemeCard";
import { UserThemeHeader } from "@main/themes";
import { classNameFactory } from "@utils/css";
import { openInviteModal } from "@utils/discord";
import { findComponentByCodeLazy } from "@webpack";
import { Menu, React, showToast, Tooltip, useState } from "@webpack/common";
import { ContextMenuApi } from "@webpack/common/menu";

const PinIcon = findComponentByCodeLazy("1-.06-.63L6.16");
const HomeIcon = findComponentByCodeLazy("m2.4 8.4 8.38-6.46a2");
const RefreshIcon = findComponentByCodeLazy("M21 2a1 1 0 0 1 1 1v6");
const LinkIcon = findComponentByCodeLazy("M16.32 14.72a1 1 0 0 1 0-1.41l2.51-2.51");
const DiscordIcon = findComponentByCodeLazy("1.6 5.64-2.87");
const DownloadIcon = findComponentByCodeLazy("1.42l3.3 3.3V3a1");

const cl = classNameFactory("vc-settings-theme-");

const themeActivationModeOptions: { value: ThemeActivationMode; label: string; }[] = [
    { value: "always", label: "Always on" },
    { value: "light", label: "Light only" },
    { value: "dark", label: "Dark only" }
];

export function getThemeActivationModeLabel(mode: ThemeActivationMode) {
    return themeActivationModeOptions.find(option => option.value === mode)?.label ?? "Always on";
}

export function ThemeActivationMenu({ themeId, activationMode, onActivationModeChange, children }: {
    themeId: string;
    activationMode: ThemeActivationMode;
    onActivationModeChange?: (mode: ThemeActivationMode) => void;
    children?: React.ReactNode;
}) {
    const [selectedMode, setSelectedMode] = useState(activationMode);

    return (
        <Menu.Menu navId={`theme-card-menu-${themeId}`} onClose={ContextMenuApi.closeContextMenu}>
            {onActivationModeChange && (
                <Menu.MenuItem id={`theme-activation-${themeId}`} label="Theme activation">
                    {themeActivationModeOptions.map(option => (
                        <Menu.MenuRadioItem
                            key={option.value}
                            id={`theme-activation-${themeId}-${option.value}`}
                            group={`theme-activation-${themeId}`}
                            label={option.label}
                            checked={selectedMode === option.value}
                            action={() => {
                                setSelectedMode(option.value);
                                onActivationModeChange(option.value);
                            }}
                        />
                    ))}
                </Menu.MenuItem>
            )}
            {children}
        </Menu.Menu>
    );
}

export function LocalThemeIcon({ size }: { size?: string; }) {
    const sizeVal = size === "sm" ? 16 : 24;
    return (
        <svg viewBox="0 0 24 24" width={sizeVal} height={sizeVal} fill="currentColor">
            <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" />
        </svg>
    );
}

export function OnlineThemeIcon({ size }: { size?: string; }) {
    const sizeVal = size === "sm" ? 16 : 24;
    return (
        <svg viewBox="0 0 24 24" width={sizeVal} height={sizeVal} fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
    );
}

export interface ThemeCardProps {
    theme: UserThemeHeader;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    onDelete?: () => void;
    showDeleteButton?: boolean;
    onEditName?: (newName: string) => void;
    disabled?: boolean;
    onPin?: () => void;
    isPinned?: boolean;
    onRefresh?: () => void;
    onOpenFolder?: () => void;
    onCopyUrl?: () => void;
    onDownload?: () => void;
    themeLink?: string;
    isLocal?: boolean;
    activationMode?: ThemeActivationMode;
    onActivationModeChange?: (mode: ThemeActivationMode) => void;
}

export function ThemeCard({ theme, enabled, onChange, onDelete, showDeleteButton, onEditName, disabled, onPin, isPinned, onRefresh, onOpenFolder, onCopyUrl, onDownload, themeLink, isLocal, activationMode = "always", onActivationModeChange }: ThemeCardProps) {
    const openThemeMenu = (e: React.MouseEvent) => {
        ContextMenuApi.openContextMenu(e, () => (
            <ThemeActivationMenu
                themeId={themeLink ?? theme.fileName}
                activationMode={activationMode}
                onActivationModeChange={onActivationModeChange}
            >
                {onPin && (
                    <Menu.MenuItem
                        id="pin-theme"
                        label={isPinned ? "Unpin" : "Pin"}
                        icon={PinIcon}
                        action={onPin}
                    />
                )}
                {theme.website && (
                    <Menu.MenuItem
                        id="open-website"
                        label="Open Website"
                        icon={HomeIcon}
                        action={() => window.open(theme.website, "_blank")}
                    />
                )}
                {theme.invite && (
                    <Menu.MenuItem
                        id="join-discord"
                        label="Join Discord"
                        icon={DiscordIcon}
                        action={() => {
                            openInviteModal(theme.invite!).catch(() =>
                                showToast({ text: "Invalid or expired invite" })
                            );
                        }}
                    />
                )}
                {onCopyUrl && themeLink && (
                    <Menu.MenuItem
                        id="copy-url"
                        label="Copy URL"
                        icon={LinkIcon}
                        action={onCopyUrl}
                    />
                )}
                {onDownload && (
                    <Menu.MenuItem
                        id="download-theme"
                        label="Download"
                        icon={DownloadIcon}
                        action={onDownload}
                    />
                )}
                {onOpenFolder && (
                    <Menu.MenuItem
                        id="open-folder"
                        label="Open in Folder"
                        icon={FolderIcon}
                        action={onOpenFolder}
                    />
                )}
                {onRefresh && (
                    <Menu.MenuItem
                        id="refresh-theme"
                        label="Refresh"
                        icon={RefreshIcon}
                        action={onRefresh}
                    />
                )}
                {(IS_WEB || showDeleteButton) && onDelete && (
                    <>
                        <Menu.MenuSeparator />
                        <Menu.MenuItem
                            id="delete-theme"
                            label="Delete"
                            color="danger"
                            icon={DeleteIcon}
                            action={() => onDelete()}
                        />
                    </>
                )}
            </ThemeActivationMenu>
        ));
    };

    return (
        <OnlineThemeCard
            customName={theme.customName}
            name={theme.name || theme.fileName || "Unknown Theme"}
            description={theme.description || "No description provided."}
            author={theme.author || "Unknown"}
            enabled={enabled}
            setEnabled={onChange}
            disabled={disabled}
            infoButton={
                (IS_WEB || showDeleteButton || onPin) && (
                    <div
                        className={cl("menu-button")}
                        onClick={openThemeMenu}
                    >
                        <CogWheel />
                    </div>
                )
            }
            footer={
                <Flex flexDirection="row" gap="0.4em" alignItems="center">
                    <Tooltip text={isLocal ? "Local Theme" : "Online Theme"}>
                        {({ onMouseLeave, onMouseEnter }) => (
                            <div
                                onMouseEnter={onMouseEnter}
                                onMouseLeave={onMouseLeave}
                                style={{ color: "var(--text-muted)", display: "flex" }}
                            >
                                {isLocal ? <LocalThemeIcon size="sm" /> : <OnlineThemeIcon size="sm" />}
                            </div>
                        )}
                    </Tooltip>
                    {isPinned && (
                        <Tooltip text="Pinned">
                            {({ onMouseLeave, onMouseEnter }) => (
                                <div
                                    onMouseEnter={onMouseEnter}
                                    onMouseLeave={onMouseLeave}
                                    className={cl("footer-pin-icon")}
                                >
                                    <PinIcon size="xs" />
                                </div>
                            )}
                        </Tooltip>
                    )}
                    {!!theme.website && <Link href={theme.website}>Website</Link>}
                    {!!(theme.website && theme.invite) && (
                        <span style={{ color: "var(--text-muted)" }}>•</span>
                    )}
                    {!!theme.invite && (
                        <Link
                            href={`https://discord.gg/${theme.invite}`}
                            onClick={async e => {
                                e.preventDefault();
                                theme.invite != null && openInviteModal(theme.invite).catch(() => showToast({ text: "Invalid or expired invite", variant: "critical" }));
                            }}
                        >
                            Discord Server
                        </Link>
                    )}
                    {activationMode !== "always" && (
                        <>
                            {!!(theme.website || theme.invite) && <span style={{ color: "var(--text-muted)" }}>•</span>}
                            <span style={{ color: "var(--text-muted)" }}>{getThemeActivationModeLabel(activationMode)}</span>
                        </>
                    )}
                </Flex>
            }

            onEditName={onEditName}
        />
    );
}
