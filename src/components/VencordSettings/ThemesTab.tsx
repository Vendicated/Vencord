/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Flex } from "@components/Flex";
import { DeleteIcon } from "@components/Icons";
import { Link } from "@components/Link";
import PluginModal from "@components/PluginSettings/PluginModal";
import { openInviteModal } from "@utils/discord";
import { openModal } from "@utils/modal";
import { showItemInFolder } from "@utils/native";
import { useAwaiter } from "@utils/react";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import {
    Button,
    Card,
    Forms,
    React,
    showToast,
    TabBar,
    useEffect,
    useRef,
    useState
} from "@webpack/common";
import { UserThemeHeader } from "main/themes";
import type { ComponentType, Ref, SyntheticEvent } from "react";

import { AddonCard } from "./AddonCard";
import { OnlineThemes } from "./OnlineThemes";
import { SettingsTab, wrapTab } from "./shared";

type FileInput = ComponentType<{
    ref: Ref<HTMLInputElement>;
    onChange: (e: SyntheticEvent<HTMLInputElement>) => void;
    multiple?: boolean;
    filters?: { name?: string; extensions: string[]; }[];
}>;

const InviteActions = findByPropsLazy("resolveInvite");
const FileInput: FileInput = findByCodeLazy("activateUploadDialogue=");

const cl = classNameFactory("vc-settings-theme-");

interface ThemeCardProps {
    theme: UserThemeHeader;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    onDelete: () => void;
    showDelete?: boolean;
    extraButtons?: React.ReactNode;
}

export function ThemeCard({ theme, enabled, onChange, onDelete, showDelete, extraButtons }: ThemeCardProps) {
    return (
        <AddonCard
            name={theme.name}
            description={theme.description}
            author={theme.author}
            enabled={enabled}
            setEnabled={onChange}
            infoButton={
                (IS_WEB || showDelete) && (<>
                    {extraButtons}
                    <div
                        style={{ cursor: "pointer", color: "var(--status-danger" }}
                        onClick={onDelete}
                    >
                        <DeleteIcon />
                    </div>
                </>
                )
            }
            footer={
                <Flex flexDirection="row" style={{ gap: "0.2em" }}>
                    {!!theme.website && <Link href={theme.website}>Website</Link>}
                    {!!(theme.website && theme.invite) && " • "}
                    {!!theme.invite && (
                        <Link
                            href={`https://discord.gg/${theme.invite}`}
                            onClick={async e => {
                                e.preventDefault();
                                theme.invite != null && openInviteModal(theme.invite).catch(() => showToast("Invalid or expired invite"));
                            }}
                        >
                            Discord Server
                        </Link>
                    )}
                </Flex>
            }
        />
    );
}

enum ThemeTab {
    LOCAL,
    ONLINE
}

function ThemesTab() {
    const settings = useSettings(["themeLinks", "disabledThemeLinks", "enabledThemes"]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentTab, setCurrentTab] = useState(ThemeTab.LOCAL);
    const [userThemes, setUserThemes] = useState<UserThemeHeader[] | null>(null);
    const [themeDir, , themeDirPending] = useAwaiter(VencordNative.themes.getThemesDir);

    useEffect(() => {
        refreshLocalThemes();
    }, [settings.themeLinks]);

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
                    VencordNative.themes
                        .uploadTheme(name, reader.result as string)
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
                    <Forms.FormText>
                        If using the BD site, click on "Download" and place the downloaded
                        .theme.css file into your themes folder.
                    </Forms.FormText>
                </Card>

                <Forms.FormSection title="Local Themes">
                    <Card className="vc-settings-quick-actions-card">
                        <>
                            {IS_WEB ? (
                                <Button size={Button.Sizes.SMALL} disabled={themeDirPending}>
                                    Upload Theme
                                    <FileInput
                                        ref={fileInputRef}
                                        onChange={onFileUpload}
                                        multiple={true}
                                        filters={[{ extensions: ["css"] }]}
                                    />
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => showItemInFolder(themeDir!)}
                                    size={Button.Sizes.SMALL}
                                    disabled={themeDirPending}
                                >
                                    Open Themes Folder
                                </Button>
                            )}
                            <Button onClick={refreshLocalThemes} size={Button.Sizes.SMALL}>
                                Load missing Themes
                            </Button>
                            <Button
                                onClick={() => VencordNative.quickCss.openEditor()}
                                size={Button.Sizes.SMALL}
                            >
                                Edit QuickCSS
                            </Button>

                            {Vencord.Settings.plugins.ClientTheme.enabled && (
                                <Button
                                    onClick={() => openModal(modalProps => (
                                        <PluginModal
                                            {...modalProps}
                                            plugin={Vencord.Plugins.plugins.ClientTheme}
                                            onRestartNeeded={() => { }}
                                        />
                                    ))}
                                    size={Button.Sizes.SMALL}
                                >
                                    Edit ClientTheme
                                </Button>
                            )}
                        </>
                    </Card>

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

    return (
        <SettingsTab title="Themes">
            <TabBar
                type="top"
                look="brand"
                className="vc-settings-tab-bar"
                selectedItem={currentTab}
                onItemSelect={setCurrentTab}
            >
                <TabBar.Item className="vc-settings-tab-bar-item" id={ThemeTab.LOCAL}>
                    Local Themes
                </TabBar.Item>
                <TabBar.Item className="vc-settings-tab-bar-item" id={ThemeTab.ONLINE}>
                    Online Themes
                </TabBar.Item>
            </TabBar>

            {currentTab === ThemeTab.LOCAL && renderLocalThemes()}
            {currentTab === ThemeTab.ONLINE && <OnlineThemes />}
        </SettingsTab>
    );
}

export default wrapTab(ThemesTab, "Themes");
