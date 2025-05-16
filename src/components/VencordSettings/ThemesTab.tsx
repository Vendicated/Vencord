/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Settings, useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Flex } from "@components/Flex";
import { DeleteIcon, FolderIcon, PaintbrushIcon, PencilIcon, PlusIcon, RestartIcon } from "@components/Icons";
import { Link } from "@components/Link";
import { openPluginModal } from "@components/PluginSettings/PluginModal";
import { getLanguage } from "@languages/Language";
import { formatText } from "@languages/LanguageUtils";
import type { UserThemeHeader } from "@main/themes";
import { openInviteModal } from "@utils/discord";
import { Margins } from "@utils/margins";
import { showItemInFolder } from "@utils/native";
import { useAwaiter } from "@utils/react";
import { findLazy } from "@webpack";
import { Card, Forms, React, showToast, TabBar, TextArea, useEffect, useRef, useState } from "@webpack/common";
import type { ComponentType, Ref, SyntheticEvent } from "react";

import Plugins from "~plugins";

import { AddonCard } from "./AddonCard";
import { QuickAction, QuickActionCard } from "./quickActions";
import { SettingsTab, wrapTab } from "./shared";

const langData = getLanguage("components");

type FileInput = ComponentType<{
    ref: Ref<HTMLInputElement>;
    onChange: (e: SyntheticEvent<HTMLInputElement>) => void;
    multiple?: boolean;
    filters?: { name?: string; extensions: string[]; }[];
}>;

const FileInput: FileInput = findLazy(m => m.prototype?.activateUploadDialogue && m.prototype.setRef);

const cl = classNameFactory("vc-settings-theme-");

function Validator({ link }: { link: string; }) {
    const l = langData.VencordSettings.ThemesTab.Validator;
    const [res, err, pending] = useAwaiter(() => fetch(link).then(res => {
        if (res.status > 300) throw `${res.status} ${res.statusText}`;
        const contentType = res.headers.get("Content-Type");
        if (!contentType?.startsWith("text/css") && !contentType?.startsWith("text/plain"))
            throw "Not a CSS file. Remember to use the raw link!";

        return "Okay!";
    }));

    const text = pending
        ? l.checking
        : err
            ? formatText(l.error, { errorMessage: err instanceof Error ? err.message : String(err) })
            : l.valid;

    return <Forms.FormText style={{
        color: pending ? "var(--text-muted)" : err ? "var(--text-danger)" : "var(--text-positive)"
    }}>{text}</Forms.FormText>;
}

function Validators({ themeLinks }: { themeLinks: string[]; }) {
    const l = langData.VencordSettings.ThemesTab.Validators;
    if (!themeLinks.length) return null;

    return (
        <>
            <Forms.FormTitle className={Margins.top20} tag="h5">{l.validator}</Forms.FormTitle>
            <Forms.FormText>{l.themesSuccessLoad}</Forms.FormText>
            <div>
                {themeLinks.map(rawLink => {
                    const { label, link } = (() => {
                        const match = /^@(light|dark) (.*)/.exec(rawLink);
                        if (!match) return { label: rawLink, link: rawLink };

                        const [, mode, link] = match;
                        return { label: formatText(l.modeOnly, { mode: mode, link: link }), link };
                    })();

                    return <Card style={{
                        padding: ".5em",
                        marginBottom: ".5em",
                        marginTop: ".5em"
                    }} key={link}>
                        <Forms.FormTitle tag="h5" style={{
                            overflowWrap: "break-word"
                        }}>
                            {label}
                        </Forms.FormTitle>
                        <Validator link={link} />
                    </Card>;
                })}
            </div>
        </>
    );
}

interface ThemeCardProps {
    theme: UserThemeHeader;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    onDelete: () => void;
}

function ThemeCard({ theme, enabled, onChange, onDelete }: ThemeCardProps) {
    const l = langData.VencordSettings.ThemesTab.ThemeCard;
    return (
        <AddonCard
            name={theme.name}
            description={theme.description}
            author={theme.author}
            enabled={enabled}
            setEnabled={onChange}
            infoButton={
                IS_WEB && (
                    <div style={{ cursor: "pointer", color: "var(--status-danger" }} onClick={onDelete}>
                        <DeleteIcon />
                    </div>
                )
            }
            footer={
                <Flex flexDirection="row" style={{ gap: "0.2em" }}>
                    {!!theme.website && <Link href={theme.website}>{l.website}</Link>}
                    {!!(theme.website && theme.invite) && " • "}
                    {!!theme.invite && (
                        <Link
                            href={`https://discord.gg/${theme.invite}`}
                            onClick={async e => {
                                e.preventDefault();
                                theme.invite != null && openInviteModal(theme.invite).catch(() => showToast(l.invalidInvite));
                            }
                            }
                        >
                            {l.dsServer}
                        </Link >
                    )}
                </Flex >
            }
        />
    );
}

enum ThemeTab {
    LOCAL,
    ONLINE
}

function ThemesTab() {
    const settings = useSettings(["themeLinks", "enabledThemes"]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentTab, setCurrentTab] = useState(ThemeTab.LOCAL);
    const [themeText, setThemeText] = useState(settings.themeLinks.join("\n"));
    const [userThemes, setUserThemes] = useState<UserThemeHeader[] | null>(null);
    const [themeDir, , themeDirPending] = useAwaiter(VencordNative.themes.getThemesDir);

    useEffect(() => {
        refreshLocalThemes();
    }, []);

    async function refreshLocalThemes() {
        const themes = await VencordNative.themes.getThemesList();
        setUserThemes(themes);
    }

    // When a local theme is enabled/disabled, update the settings
    function onLocalThemeChange(fileName: string, value: boolean) {
        if (value) {
            if (settings.enabledThemes.includes(fileName)) return;
            settings.enabledThemes = [...settings.enabledThemes, fileName];
        } else {
            settings.enabledThemes = settings.enabledThemes.filter(f => f !== fileName);
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
        refreshLocalThemes();
    }

    function renderLocalThemes() {
        const l = langData.VencordSettings.ThemesTab.renderLocalThemes;
        return (
            <>
                <Card className="vc-settings-card">
                    <Forms.FormTitle tag="h5">{l.fingThemes}</Forms.FormTitle>
                    <div style={{ marginBottom: ".5em", display: "flex", flexDirection: "column" }}>
                        <Link style={{ marginRight: ".5em" }} href="https://betterdiscord.app/themes">
                            {l.BDThemes}
                        </Link>
                        <Link href="https://github.com/search?q=discord+theme">{l.github}</Link>
                    </div>
                    <Forms.FormText>{l.BDInfo}</Forms.FormText>
                </Card>

                <Forms.FormSection title={l.localThemes}>
                    <QuickActionCard>
                        <>
                            {IS_WEB ?
                                (
                                    <QuickAction
                                        text={
                                            <span style={{ position: "relative" }}>
                                                {l.uploadThemes}
                                                <FileInput
                                                    ref={fileInputRef}
                                                    onChange={onFileUpload}
                                                    multiple={true}
                                                    filters={[{ extensions: ["css"] }]}
                                                />
                                            </span>
                                        }
                                        Icon={PlusIcon}
                                    />
                                ) : (
                                    <QuickAction
                                        text={l.themesFolder}
                                        action={() => showItemInFolder(themeDir!)}
                                        disabled={themeDirPending}
                                        Icon={FolderIcon}
                                    />
                                )}
                            <QuickAction
                                text={l.loadThemes}
                                action={refreshLocalThemes}
                                Icon={RestartIcon}
                            />
                            <QuickAction
                                text={l.editQuickCSS}
                                action={() => VencordNative.quickCss.openEditor()}
                                Icon={PaintbrushIcon}
                            />

                            {Settings.plugins.ClientTheme.enabled && (
                                <QuickAction
                                    text={l.editClientTheme}
                                    action={() => openPluginModal(Plugins.ClientTheme)}
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

    // When the user leaves the online theme textbox, update the settings
    function onBlur() {
        settings.themeLinks = [...new Set(
            themeText
                .trim()
                .split(/\n+/)
                .map(s => s.trim())
                .filter(Boolean)
        )];
    }

    function renderOnlineThemes() {
        const l = langData.VencordSettings.ThemesTab.renderOnlineThemes;
        return (
            <>
                <Card className="vc-settings-card vc-text-selectable">
                    <Forms.FormTitle tag="h5">{l.cssLink}</Forms.FormTitle>
                    <Forms.FormText>{l.oneLink}</Forms.FormText>
                    <Forms.FormText>{l.linesPrefix}</Forms.FormText>
                    <Forms.FormText>{l.directLinks}</Forms.FormText>
                </Card>

                <Forms.FormSection title={l.onlineThemes} tag="h5">
                    <TextArea
                        value={themeText}
                        onChange={setThemeText}
                        className={"vc-settings-theme-links"}
                        placeholder={l.themesLinks}
                        spellCheck={false}
                        onBlur={onBlur}
                        rows={10}
                    />
                    <Validators themeLinks={settings.themeLinks} />
                </Forms.FormSection>
            </>
        );
    }
    const l = langData.VencordSettings.ThemesTab.renderOnlineThemes;
    return (
        <SettingsTab title={l.themes}>
            <TabBar
                type="top"
                look="brand"
                className="vc-settings-tab-bar"
                selectedItem={currentTab}
                onItemSelect={setCurrentTab}
            >
                <TabBar.Item
                    className="vc-settings-tab-bar-item"
                    id={ThemeTab.LOCAL}
                >
                    {l.localThemes}
                </TabBar.Item>
                <TabBar.Item
                    className="vc-settings-tab-bar-item"
                    id={ThemeTab.ONLINE}
                >
                    {l.onlineThemes}
                </TabBar.Item>
            </TabBar>

            {currentTab === ThemeTab.LOCAL && renderLocalThemes()}
            {currentTab === ThemeTab.ONLINE && renderOnlineThemes()}
        </SettingsTab>
    );
}

export default wrapTab(ThemesTab, "Themes");
