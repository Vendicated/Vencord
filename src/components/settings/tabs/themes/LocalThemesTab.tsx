/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings, useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { FolderIcon, PaintbrushIcon, PencilIcon, PlusIcon, RestartIcon } from "@components/Icons";
import { Link } from "@components/Link";
import { QuickAction, QuickActionCard } from "@components/settings/QuickAction";
import { openPluginModal } from "@components/settings/tabs/plugins/PluginModal";
import { UserThemeHeader } from "@main/themes";
import { findLazy } from "@webpack";
import { Card, Forms, useEffect, useRef, useState } from "@webpack/common";
import ClientThemePlugin from "plugins/clientTheme";
import type { ComponentType, Ref, SyntheticEvent } from "react";

import { ThemeCard } from "./ThemeCard";

const cl = classNameFactory("vc-settings-theme-");

type FileInput = ComponentType<{
    ref: Ref<HTMLInputElement>;
    onChange: (e: SyntheticEvent<HTMLInputElement>) => void;
    multiple?: boolean;
    filters?: { name?: string; extensions: string[]; }[];
}>;

const FileInput: FileInput = findLazy(m => m.prototype?.activateUploadDialogue && m.prototype.setRef);

// When a local theme is enabled/disabled, update the settings
function onLocalThemeChange(fileName: string, value: boolean) {
    if (value) {
        if (Settings.enabledThemes.includes(fileName)) return;
        Settings.enabledThemes = [...Settings.enabledThemes, fileName];
    } else {
        Settings.enabledThemes = Settings.enabledThemes.filter(f => f !== fileName);
    }
}

async function onFileUpload(e: SyntheticEvent<HTMLInputElement>) {
    e.stopPropagation();
    e.preventDefault();

    if (!e.currentTarget?.files?.length) return;
    const { files } = e.currentTarget;

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
}

export function LocalThemesTab() {
    const settings = useSettings(["enabledThemes"]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [userThemes, setUserThemes] = useState<UserThemeHeader[] | null>(null);

    useEffect(() => {
        refreshLocalThemes();
    }, []);

    async function refreshLocalThemes() {
        const themes = await VencordNative.themes.getThemesList();
        setUserThemes(themes);
    }

    return (
        <>
            <Card className="vc-settings-card">
                <Forms.FormTitle tag="h5">Find Themes:</Forms.FormTitle>
                <div style={{ marginBottom: ".5em", display: "flex", flexDirection: "column" }}>
                    <Link style={{ marginRight: ".5em" }} href="https://betterdiscord.app/themes">
                        BetterDiscord Themes
                    </Link>
                    <Link href="https://github.com/search?q=discord+theme">GitHub</Link>
                </div>
                <Forms.FormText>If using the BD site, click on "Download" and place the downloaded .theme.css file into your themes folder.</Forms.FormText>
            </Card>

            <Card className="vc-settings-card">
                <Forms.FormTitle tag="h5">External Resources</Forms.FormTitle>
                <Forms.FormText>For security reasons, loading resources (styles, fonts, images, ...) from most sites is blocked.</Forms.FormText>
                <Forms.FormText>Make sure all your assets are hosted on GitHub, GitLab, Codeberg, Imgur, Discord or Google Fonts.</Forms.FormText>
            </Card>

            <Forms.FormSection title="Local Themes">
                <QuickActionCard>
                    <>
                        {IS_WEB ?
                            (
                                <QuickAction
                                    text={
                                        <span style={{ position: "relative" }}>
                                            Upload Theme
                                            <FileInput
                                                ref={fileInputRef}
                                                onChange={async e => {
                                                    await onFileUpload(e);
                                                    refreshLocalThemes();
                                                }}
                                                multiple={true}
                                                filters={[{ extensions: ["css"] }]}
                                            />
                                        </span>
                                    }
                                    Icon={PlusIcon}
                                />
                            ) : (
                                <QuickAction
                                    text="Open Themes Folder"
                                    action={() => VencordNative.themes.openFolder()}
                                    Icon={FolderIcon}
                                />
                            )}
                        <QuickAction
                            text="Load missing Themes"
                            action={refreshLocalThemes}
                            Icon={RestartIcon}
                        />
                        <QuickAction
                            text="Edit QuickCSS"
                            action={() => VencordNative.quickCss.openEditor()}
                            Icon={PaintbrushIcon}
                        />

                        {Vencord.Plugins.isPluginEnabled(ClientThemePlugin.name) && (
                            <QuickAction
                                text="Edit ClientTheme"
                                action={() => openPluginModal(ClientThemePlugin)}
                                Icon={PencilIcon}
                            />
                        )}
                    </>
                </QuickActionCard>

                <div className={cl("grid")}>
                    {userThemes?.map(theme => (
                        <ThemeCard
                            key={theme.fileName}
                            enabled={settings.enabledThemes.includes(theme.fileName)}
                            onChange={enabled => onLocalThemeChange(theme.fileName, enabled)}
                            onDelete={async () => {
                                onLocalThemeChange(theme.fileName, false);
                                await VencordNative.themes.deleteTheme(theme.fileName);
                                refreshLocalThemes();
                            }}
                            theme={theme}
                        />
                    ))}
                </div>
            </Forms.FormSection>
        </>
    );
}
