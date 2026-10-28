/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Settings, type ThemeActivationMode, useSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { ErrorCard } from "@components/ErrorCard";
import { Heading } from "@components/Heading";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { getThemeInfo, UserThemeHeader } from "@main/themes";
import { CspBlockedUrls, useCspErrors } from "@utils/cspViolations";
import { classNameFactory } from "@utils/css";
import { copyWithToast } from "@utils/discord";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { promptToRestart } from "@utils/promptToRestart";
import { useForceUpdater } from "@utils/react";
import { getStylusWebStoreUrl } from "@utils/web";
import { React, Select, showToast, TextInput, useEffect, useMemo, useRef, useState } from "@webpack/common";
import { SyntheticEvent } from "react";

import { OnlineThemesSection } from "./OnlineThemes";
import { QuickActionsSection } from "./QuickActions";
import { ThemeCard } from "./ThemeCard";

const cl = classNameFactory("vc-settings-theme-");

enum ThemeFilter {
    All = "all",
    Online = "online",
    Local = "local",
    Enabled = "enabled",
    Disabled = "disabled"
}

const filterOptions = [
    { label: "Show All", value: ThemeFilter.All },
    { label: "Online Themes", value: ThemeFilter.Online },
    { label: "Local Themes", value: ThemeFilter.Local },
    { label: "Enabled", value: ThemeFilter.Enabled },
    { label: "Disabled", value: ThemeFilter.Disabled }
];

function inferThemeActivationMode(css: string) {
    let text = css.replace(/^\uFEFF/, "");

    while (true) {
        const trimmed = text.trimStart();
        if (trimmed !== text) text = trimmed;

        const comment = /^\/\*[\s\S]*?\*\/\s*/.exec(text);
        if (!comment) break;
        text = text.slice(comment[0].length);
    }

    const match = /^@(light|dark)\b/i.exec(text);
    return match?.[1].toLowerCase() as ThemeActivationMode | undefined;
}

function inferAndStoreThemeActivationMode(themeId: string, css: string) {
    const activationMode = Settings.themeActivationModes?.[themeId] ?? inferThemeActivationMode(css);
    if (!activationMode || themeId in (Settings.themeActivationModes ?? {})) return;

    Settings.themeActivationModes = {
        ...(Settings.themeActivationModes ?? {}),
        [themeId]: activationMode,
    };
}

interface UnifiedTheme {
    type: "local" | "online";
    name: string;
    enabled: boolean;
    header: UserThemeHeader;
    link?: string;
    activationMode: ThemeActivationMode;
}

function CspErrorCard() {
    const errors = useCspErrors();
    const forceUpdate = useForceUpdater();

    if (IS_WEB || !errors.length) return null;

    const isImgurHtmlDomain = (url: string) => url.startsWith("https://imgur.com/");

    const allowableUrls = errors.filter(url => URL.canParse(url) && !isImgurHtmlDomain(url));
    const allowableHosts = new Set(allowableUrls.map(url => new URL(url).host));

    const allowUrls = async (urls: string[]) => {
        const result = await VencordNative.csp.requestAddOverride(urls.map(url => new URL(url).origin), ["connect-src", "img-src", "style-src", "font-src"], "Equicord Themes");
        if (result !== "ok") return;

        const hosts = new Set(urls.map(url => new URL(url).host));
        CspBlockedUrls.forEach(url => {
            if (URL.canParse(url) && hosts.has(new URL(url).host)) CspBlockedUrls.delete(url);
        });

        forceUpdate();
        promptToRestart("relaunch");
    };

    return (
        <ErrorCard className={classes(cl("error-card"), Margins.top16)}>
            <Heading className={Margins.bottom8}>Blocked Resources</Heading>
            <Paragraph className={Margins.bottom8}>
                Some resources were blocked from disallowed domains. Move them to GitHub or Imgur, or allow trusted domains below.
            </Paragraph>

            {allowableHosts.size > 1 && (
                <Button size="small" className={Margins.bottom8} onClick={() => allowUrls(allowableUrls)}>
                    Allow All ({allowableHosts.size} domains)
                </Button>
            )}

            {errors.map(url => (
                <div key={url} className="vc-settings-csp-row">
                    <Link href={url}>{url}</Link>
                    <Button size="small" variant="secondary" onClick={() => allowUrls([url])} disabled={!allowableUrls.includes(url)}>
                        Allow
                    </Button>
                </div>
            ))}

            {errors.some(isImgurHtmlDomain) && (
                <Paragraph color="text-subtle" className={Margins.top8}>
                    Imgur links should be direct links like <code>https://i.imgur.com/...</code>
                </Paragraph>
            )}
        </ErrorCard>
    );
}

function ThemesTab() {
    const settings = useSettings(["themeLinks", "enabledThemeLinks", "enabledThemes", "enableOnlineThemes", "pinnedThemes", "themeActivationModes.*"]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentThemeLink, setCurrentThemeLink] = useState("");
    const [themeLinkValid, setThemeLinkValid] = useState(false);
    const [userThemes, setUserThemes] = useState<UserThemeHeader[] | null>(null);
    const [onlineThemes, setOnlineThemes] = useState<(UserThemeHeader & { link: string; })[] | null>(null);
    const [themeNames, setThemeNames] = useState<Record<string, string>>(() => {
        return settings.themeNames ?? {};
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState(ThemeFilter.All);

    useEffect(() => {
        void updateThemes();
    }, []);

    async function updateThemes() {
        await Promise.allSettled([refreshLocalThemes(), refreshOnlineThemes()]);
    }

    async function refreshLocalThemes() {
        const themes = await VencordNative.themes.getThemesList();
        setUserThemes(themes);
    }

    function onLocalThemeChange(fileName: string, value: boolean) {
        if (value) {
            if (settings.enabledThemes.includes(fileName)) return;
            settings.enabledThemes = [...settings.enabledThemes, fileName];
        } else {
            settings.enabledThemes = settings.enabledThemes.filter(f => f !== fileName);
        }
    }

    async function doUploadThemes(files: ArrayLike<File>) {
        const uploads = Array.from(files, file => {
            const { name } = file;
            if (!name.endsWith(".css")) return;

            return new Promise<void>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    VencordNative.themes.uploadTheme(name, reader.result as string)
                        .then(resolve)
                        .catch(reject);
                };
                reader.readAsText(file);
            });
        });

        await Promise.all(uploads);
        refreshLocalThemes();
    }

    async function onFileUpload(e: SyntheticEvent<HTMLInputElement>) {
        e.stopPropagation();
        e.preventDefault();

        if (!e.currentTarget?.files?.length) return;
        await doUploadThemes(e.currentTarget.files);
    }

    function useDropFile(refreshThemes: Function) {
        useEffect(() => {
            const onDragOver = (e: DragEvent) => {
                if (!e.dataTransfer?.items.length) return;
                if (!Array.from(e.dataTransfer.items).some(item => item.kind === "file" && item.getAsFile()?.name.endsWith(".css")))
                    return;

                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
            };

            const onDrop = async (e: DragEvent) => {
                e.preventDefault();

                if (!e.dataTransfer?.files.length) return;

                await doUploadThemes(
                    Array.from(e.dataTransfer.files).filter(file => file.name.endsWith(".css"))
                );

                refreshThemes();
            };

            window.addEventListener("dragover", onDragOver);
            window.addEventListener("drop", onDrop);

            return () => {
                window.removeEventListener("dragover", onDragOver);
                window.removeEventListener("drop", onDrop);
            };
        }, []);
    }

    function addThemeLink(link: string) {
        if (!themeLinkValid) return;
        if (settings.themeLinks.includes(link)) return;

        settings.themeLinks = [...settings.themeLinks, link];
        setCurrentThemeLink("");
        refreshOnlineThemes();
    }

    // This condition is compile time so conditional hook is okay
    if (IS_WEB) useDropFile(refreshLocalThemes);

    async function refreshOnlineThemes() {
        const themes = await Promise.all(
            settings.themeLinks.map(async link => {
                try {
                    const res = await fetch(link);
                    if (!res.ok) throw new Error(`Failed to fetch ${link}`);
                    const css = await res.text();
                    inferAndStoreThemeActivationMode(link, css);

                    return { ...getThemeInfo(css, link), link };
                } catch {
                    return null;
                }
            })
        );
        setOnlineThemes(themes.filter(theme => theme !== null));
    }

    function onThemeLinkEnabledChange(link: string, enabled: boolean) {
        if (enabled) {
            if (settings.enabledThemeLinks.includes(link)) return;
            settings.enabledThemeLinks = [...settings.enabledThemeLinks, link];
        } else {
            settings.enabledThemeLinks = settings.enabledThemeLinks.filter(f => f !== link);
        }
    }

    function clearThemeState(themeId: string) {
        settings.pinnedThemes = settings.pinnedThemes.filter(f => f !== themeId);
        settings.enabledThemes = settings.enabledThemes.filter(f => f !== themeId);
        settings.enabledThemeLinks = settings.enabledThemeLinks.filter(f => f !== themeId);
        settings.themeNames = Object.fromEntries(Object.entries(settings.themeNames).filter(([key]) => key !== themeId));

        const themeActivationModes = { ...(settings.themeActivationModes ?? {}) };
        delete themeActivationModes[themeId];
        settings.themeActivationModes = themeActivationModes;
    }

    function deleteThemeLink(link: string) {
        settings.themeLinks = settings.themeLinks.filter(f => f !== link);
        clearThemeState(link);
        refreshOnlineThemes();
    }

    function setThemeActivationMode(themeId: string, mode: ThemeActivationMode) {
        const themeActivationModes = { ...(settings.themeActivationModes ?? {}) };

        if (mode === "always") {
            delete themeActivationModes[themeId];
        } else {
            themeActivationModes[themeId] = mode;
        }

        settings.themeActivationModes = themeActivationModes;
    }

    function togglePinTheme(themeId: string) {
        if (settings.pinnedThemes.includes(themeId)) {
            settings.pinnedThemes = settings.pinnedThemes.filter(f => f !== themeId);
        } else {
            settings.pinnedThemes = [...settings.pinnedThemes, themeId];
        }
    }

    async function refreshOnlineTheme(link: string) {
        try {
            const res = await fetch(link);
            if (!res.ok) throw new Error(`Failed to fetch ${link}`);
            const css = await res.text();
            inferAndStoreThemeActivationMode(link, css);

            const updatedTheme = { ...getThemeInfo(css, link), link };

            setOnlineThemes(prev =>
                prev?.map(t => t.link === link ? updatedTheme : t) ?? null
            );
            showToast({ text: "Theme refreshed!", variant: "success" });
        } catch {
            showToast({ text: "Failed to refresh theme", variant: "critical" });
        }
    }

    async function downloadTheme(link: string, name: string) {
        try {
            const res = await fetch(link);
            if (!res.ok) throw new Error(`Failed to fetch ${link}`);
            const css = await res.text();
            const fileName = name.replace(/[^a-z0-9]/gi, "-") + ".css";

            if (IS_DISCORD_DESKTOP) {
                DiscordNative.fileManager.saveWithDialog(new TextEncoder().encode(css), fileName);
            } else {
                const blob = new Blob([css], { type: "text/css" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch {
            showToast({ text: "Failed to download theme", variant: "critical" });
        }
    }

    const allThemes = useMemo((): UnifiedTheme[] => {
        const themes: UnifiedTheme[] = [];

        for (const theme of onlineThemes ?? []) {
            const customName = themeNames[theme.link] ?? null;
            themes.push({
                type: "online",
                name: customName ?? theme.name ?? theme.fileName,
                enabled: settings.enabledThemeLinks.includes(theme.link),
                header: { ...theme, customName },
                link: theme.link,
                activationMode: settings.themeActivationModes?.[theme.link] ?? "always",
            });
        }

        for (const header of userThemes ?? []) {
            const name = header.name ?? header.fileName;

            themes.push({
                type: "local",
                name,
                enabled: settings.enabledThemes.includes(header.fileName),
                header,
                activationMode: settings.themeActivationModes?.[header.fileName] ?? "always",
            });
        }

        return themes;
    }, [onlineThemes, userThemes, themeNames, settings.enabledThemeLinks, settings.enabledThemes, settings.themeActivationModes]);

    const filteredThemes = useMemo(() => {
        let themes = allThemes;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            themes = themes.filter(t => t.name.toLowerCase().includes(query));
        }

        switch (filter) {
            case ThemeFilter.Online:
                themes = themes.filter(t => t.type === "online");
                break;
            case ThemeFilter.Local:
                themes = themes.filter(t => t.type === "local");
                break;
            case ThemeFilter.Enabled:
                themes = themes.filter(t => t.enabled);
                break;
            case ThemeFilter.Disabled:
                themes = themes.filter(t => !t.enabled);
                break;
        }

        const getThemeId = (t: UnifiedTheme) => t.type === "online" ? t.link! : t.header.fileName;
        themes.sort((a, b) => {
            const aId = getThemeId(a);
            const bId = getThemeId(b);
            const aPinIndex = settings.pinnedThemes.indexOf(aId);
            const bPinIndex = settings.pinnedThemes.indexOf(bId);
            const aIsPinned = aPinIndex !== -1;
            const bIsPinned = bPinIndex !== -1;

            if (aIsPinned && !bIsPinned) return -1;
            if (!aIsPinned && bIsPinned) return 1;
            if (aIsPinned && bIsPinned) return aPinIndex - bPinIndex;
            return 0;
        });

        return themes;
    }, [allThemes, searchQuery, filter, settings.pinnedThemes]);

    const localCount = allThemes.filter(t => t.type === "local").length;
    const onlineCount = allThemes.filter(t => t.type === "online").length;
    const enabledCount = allThemes.filter(t => t.enabled).length;

    return (
        <SettingsTab>
            <CspErrorCard />

            <Heading className={Margins.top16}>Theme Management</Heading>
            <Paragraph className={Margins.bottom16}>
                Customize Discord's appearance with themes. Add local .css files or load themes directly from URLs. Themes with a cog wheel icon have customizable settings you can modify.
            </Paragraph>

            <Heading>Quick Actions</Heading>
            <Paragraph className={Margins.bottom16}>
                Shortcuts for managing your themes. Open your themes folder to add new themes, use QuickCSS for quick style tweaks, or reload themes after making changes.
            </Paragraph>

            <QuickActionsSection
                fileInputRef={fileInputRef}
                onFileUpload={onFileUpload}
                refreshLocalThemes={refreshLocalThemes}
            />

            <Divider className={Margins.top20} />

            <OnlineThemesSection
                enableOnlineThemes={settings.enableOnlineThemes ?? true}
                setEnableOnlineThemes={value => {
                    settings.enableOnlineThemes = value;
                    if (!value) {
                        settings.enabledThemeLinks = [];
                    }
                }}
                currentThemeLink={currentThemeLink}
                setCurrentThemeLink={setCurrentThemeLink}
                themeLinkValid={themeLinkValid}
                setThemeLinkValid={setThemeLinkValid}
                addThemeLink={addThemeLink}
            />

            <Divider className={Margins.top20} />

            <Heading className={Margins.top20}>Installed Themes</Heading>
            <Paragraph className={Margins.bottom8}>
                Manage your themes here. Local themes load from your themes folder, online themes from URLs. Themes with a cog wheel icon have customizable settings.
            </Paragraph>
            <Paragraph color="text-subtle" className={Margins.bottom16}>
                {allThemes.length} theme{allThemes.length !== 1 ? "s" : ""} installed ({localCount} local, {onlineCount} online) · {enabledCount} enabled
            </Paragraph>

            <div className={cl("filter-row")}>
                <TextInput
                    placeholder="Search for a theme..."
                    value={searchQuery}
                    onChange={setSearchQuery}
                />
                <div>
                    <Select
                        options={filterOptions}
                        select={setFilter}
                        isSelected={v => v === filter}
                        serialize={v => v}
                    />
                </div>
            </div>

            {userThemes === null ? (
                <Paragraph color="text-muted" className={Margins.top16}>Loading themes...</Paragraph>
            ) : filteredThemes.length === 0 ? (
                <Paragraph color="text-muted" className={Margins.top16}>
                    {allThemes.length === 0
                        ? "No themes installed yet. Add theme files to your themes folder or add an online theme above to get started."
                        : "No themes match your search or filter criteria."
                    }
                </Paragraph>
            ) : (
                <div className={classes(cl("grid"), Margins.top16)}>
                    {filteredThemes.map(theme => {
                        if (theme.type === "online") {
                            const onlineTheme = theme.header as UserThemeHeader & { link: string; };
                            const onlineThemesDisabled = !(settings.enableOnlineThemes ?? true);
                            return (
                                <ThemeCard
                                    key={onlineTheme.link}
                                    theme={onlineTheme}
                                    enabled={theme.enabled}
                                    onChange={enabled => onThemeLinkEnabledChange(onlineTheme.link, enabled)}
                                    onDelete={() => {
                                        onThemeLinkEnabledChange(onlineTheme.link, false);
                                        deleteThemeLink(onlineTheme.link);
                                    }}
                                    showDeleteButton
                                    disabled={onlineThemesDisabled}
                                    onPin={() => togglePinTheme(onlineTheme.link)}
                                    isPinned={settings.pinnedThemes.includes(onlineTheme.link)}
                                    themeLink={onlineTheme.link}
                                    onCopyUrl={() => copyWithToast(onlineTheme.link, "Theme URL copied!")}
                                    onRefresh={() => refreshOnlineTheme(onlineTheme.link)}
                                    onDownload={() => downloadTheme(onlineTheme.link, onlineTheme.name ?? "theme")}
                                    isLocal={false}
                                    activationMode={theme.activationMode}
                                    onActivationModeChange={mode => setThemeActivationMode(onlineTheme.link, mode)}
                                    onEditName={newName => {
                                        const updatedNames = { ...themeNames, [onlineTheme.link]: newName };
                                        setThemeNames(updatedNames);
                                        settings.themeNames = {
                                            ...settings.themeNames,
                                            [onlineTheme.link]: newName,
                                        };
                                    }}
                                />
                            );
                        }

                        const localTheme = theme.header;
                        return (
                            <ThemeCard
                                key={localTheme.fileName}
                                enabled={theme.enabled}
                                onChange={enabled => onLocalThemeChange(localTheme.fileName, enabled)}
                                onDelete={async () => {
                                    onLocalThemeChange(localTheme.fileName, false);
                                    clearThemeState(localTheme.fileName);
                                    await VencordNative.themes.deleteTheme(localTheme.fileName);
                                    refreshLocalThemes();
                                }}
                                showDeleteButton
                                onPin={() => togglePinTheme(localTheme.fileName)}
                                isPinned={settings.pinnedThemes.includes(localTheme.fileName)}
                                onRefresh={refreshLocalThemes}
                                isLocal
                                theme={localTheme}
                                activationMode={theme.activationMode}
                                onActivationModeChange={mode => setThemeActivationMode(localTheme.fileName, mode)}
                            />
                        );
                    })}
                </div>
            )}
        </SettingsTab>
    );
}

function UserscriptThemesTab() {
    return (
        <SettingsTab>
            <Heading className={Margins.top16}>Themes Not Supported</Heading>
            <Paragraph className={Margins.bottom8}>
                Themes are not available on the Userscript version.
            </Paragraph>
            <Paragraph color="text-subtle">
                You can install themes using the <Link href={getStylusWebStoreUrl()}>Stylus extension</Link> instead.
            </Paragraph>
        </SettingsTab>
    );
}

export default IS_USERSCRIPT
    ? wrapTab(UserscriptThemesTab, "Themes")
    : wrapTab(ThemesTab, "Themes");
