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

import "./themesStyles.css";

import { Settings, useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { ErrorCard } from "@components/ErrorCard";
import { Flex } from "@components/Flex";
import { CogWheel, DeleteIcon, FolderIcon, PaintbrushIcon, PencilIcon, PluginIcon, PlusIcon, RestartIcon } from "@components/Icons";
import { Link } from "@components/Link";
import { AddonCard, openPluginModal, QuickAction, QuickActionCard, SettingsTab, wrapTab } from "@components/settings";
import { OnlineThemeCard } from "@components/settings/OnlineThemeCard";
import { CspBlockedUrls, useCspErrors } from "@utils/cspViolations";
import { openInviteModal } from "@utils/discord";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { openModal } from "@utils/modal";
import { relaunch, showItemInFolder } from "@utils/native";
import { useAwaiter, useForceUpdater } from "@utils/react";
import type { ThemeHeader } from "@utils/themes";
import { getThemeInfo, stripBOM, type UserThemeHeader } from "@utils/themes/bd";
import { usercssParse } from "@utils/themes/usercss";
import { getStylusWebStoreUrl } from "@utils/web";
import { findLazy } from "@webpack";
import { Alerts, Button, Card, Forms, React, showToast, TabBar, TextInput, Tooltip, useEffect, useMemo, useRef, useState } from "@webpack/common";
import type { ComponentType, Ref, SyntheticEvent } from "react";
import type { UserstyleHeader } from "usercss-meta";

import Plugins from "~plugins";

import { UserCSSSettingsModal } from "./UserCSSModal";

type FileInput = ComponentType<{
    ref: Ref<HTMLInputElement>;
    onChange: (e: SyntheticEvent<HTMLInputElement>) => void;
    multiple?: boolean;
    filters?: { name?: string; extensions: string[]; }[];
}>;
const FileInput: FileInput = findLazy(m => m.prototype?.activateUploadDialogue && m.prototype.setRef);

const cl = classNameFactory("vc-settings-theme-");

function Validator({ link, onValidate }: { link: string; onValidate: (valid: boolean) => void; }) {
    const [res, err, pending] = useAwaiter(() => fetch(link).then(res => {
        if (res.status > 300) throw `${res.status} ${res.statusText}`;
        const contentType = res.headers.get("Content-Type");
        if (!contentType?.startsWith("text/css") && !contentType?.startsWith("text/plain")) {
            onValidate(false);
            throw "Not a CSS file. Remember to use the raw link!";
        }

        onValidate(true);
        return "Okay!";
    }));

    const text = pending
        ? "Checking..."
        : err
            ? `Error: ${err instanceof Error ? err.message : String(err)}`
            : "Valid!";

    return <Forms.FormText style={{
        color: pending ? "var(--text-muted)" : err ? "var(--text-danger)" : "var(--status-positive)"
    }}>{text}</Forms.FormText>;
}

interface OtherThemeCardProps {
    theme: UserThemeHeader;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    onDelete: () => void;
    showDeleteButton?: boolean;
    onEditName?: (newName: string) => void;
}

interface UserCSSCardProps {
    theme: UserstyleHeader;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    onDelete: () => void;
    onSettingsReset: () => void;
}

function UserCSSThemeCard({ theme, enabled, onChange, onDelete, onSettingsReset }: UserCSSCardProps) {
    const missingPlugins = useMemo(() =>
        theme.requiredPlugins?.filter(p => !Vencord.Plugins.isPluginEnabled(p)), [theme]);

    return (
        <AddonCard
            name={theme.name ?? "Unknown"}
            description={theme.description}
            author={theme.author ?? "Unknown"}
            enabled={enabled}
            setEnabled={onChange}
            disabled={missingPlugins && missingPlugins.length > 0}
            infoButton={
                <>
                    {missingPlugins && missingPlugins.length > 0 && (
                        <Tooltip text={"The following plugins are required, but aren't enabled: " + missingPlugins.join(", ")}>
                            {({ onMouseLeave, onMouseEnter }) => (
                                <div
                                    style={{ color: "var(--status-danger" }}
                                    onMouseEnter={onMouseEnter}
                                    onMouseLeave={onMouseLeave}
                                >
                                    <PluginIcon />
                                </div>
                            )}
                        </Tooltip>
                    )}
                    {theme.vars && (
                        <div style={{ cursor: "pointer" }} onClick={
                            () => openModal(modalProps =>
                                <UserCSSSettingsModal modalProps={modalProps} theme={theme} onSettingsReset={onSettingsReset} />)
                        }>
                            <CogWheel />
                        </div>
                    )}
                    {IS_WEB && (
                        <div style={{ cursor: "pointer", color: "var(--status-danger" }} onClick={onDelete}>
                            <DeleteIcon />
                        </div>
                    )}
                </>
            }
            footer={
                <Flex flexDirection="row" style={{ gap: "0.2em" }}>
                    {!!theme.homepageURL && <Link href={theme.homepageURL}>Homepage</Link>}
                    {!!(theme.homepageURL && theme.supportURL) && " • "}
                    {!!theme.supportURL && <Link href={theme.supportURL}>Support</Link>}
                </Flex>
            }
        />
    );
}

function OtherThemeCard({ theme, enabled, onChange, onDelete, showDeleteButton, onEditName }: OtherThemeCardProps) {
    return (
        <OnlineThemeCard
            customName={theme.customName}
            name={theme.name}
            description={theme.description}
            author={theme.author}
            enabled={enabled}
            setEnabled={onChange}
            infoButton={
                (IS_WEB || showDeleteButton) && (
                    <div style={{ cursor: "pointer", color: "var(--status-danger" }} onClick={onDelete}>
                        <DeleteIcon />
                    </div>
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
                                theme.invite != null &&
                                    openInviteModal(theme.invite).catch(() =>
                                        showToast("Invalid or expired invite")
                                    );
                            }}
                        >
                            Discord Server
                        </Link>
                    )}
                </Flex>
            }

            onEditName={onEditName}
        />
    );
}

enum ThemeTab {
    LOCAL,
    ONLINE
}

function ThemesTab() {
    const settings = useSettings(["themeLinks", "enabledThemeLinks", "enabledThemes"]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentTab, setCurrentTab] = useState(ThemeTab.LOCAL);
    const [currentThemeLink, setCurrentThemeLink] = useState("");
    const [themeLinkValid, setThemeLinkValid] = useState(false);
    const [userThemes, setUserThemes] = useState<ThemeHeader[] | null>(null);
    const [onlineThemes, setOnlineThemes] = useState<(UserThemeHeader & { link: string; })[] | null>(null);
    const [themeNames, setThemeNames] = useState<Record<string, string>>(() => {
        return settings.themeNames ?? {};
    });
    const [themeDir, , themeDirPending] = useAwaiter(VencordNative.themes.getThemesDir);

    useEffect(() => {
        updateThemes();
    }, []);

    async function updateThemes() {
        await changeThemeLibraryURLs();
        refreshLocalThemes();
        refreshOnlineThemes();
    }

    async function changeThemeLibraryURLs() {
        settings.themeLinks = settings.themeLinks.map(link => {
            if (link.startsWith("https://themes-delta.vercel.app/api")) {
                return link.replace("https://themes-delta.vercel.app/api", "https://discord-themes.com/api");
            }
            return link;
        });
    }

    async function refreshLocalThemes() {
        const themes = await VencordNative.themes.getThemesList();
        const themeInfo: ThemeHeader[] = [];

        for (const { fileName, content } of themes) {
            if (!fileName.endsWith(".css")) continue;

            if ((!IS_WEB || "legcord" in window) && fileName.endsWith(".user.css")) {
                // handle it as usercss
                const header = await usercssParse(content, fileName);

                themeInfo.push({
                    type: "usercss",
                    header
                });

                Settings.userCssVars[header.id] ??= {};

                for (const [name, varInfo] of Object.entries(header.vars ?? {})) {
                    let normalizedValue = "";

                    switch (varInfo.type) {
                        case "text":
                        case "color":
                        case "checkbox":
                            normalizedValue = varInfo.default;
                            break;
                        case "select":
                            normalizedValue = varInfo.options.find(v => v.name === varInfo.default)!.value;
                            break;
                        case "range":
                            normalizedValue = `${varInfo.default}${varInfo.units}`;
                            break;
                        case "number":
                            normalizedValue = String(varInfo.default);
                            break;
                    }

                    Settings.userCssVars[header.id][name] ??= normalizedValue;
                }
            } else {
                // presumably BD but could also be plain css
                themeInfo.push({
                    type: "other",
                    header: getThemeInfo(stripBOM(content), fileName)
                });
            }
        }

        setUserThemes(themeInfo);
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

    function LocalThemes() {
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
                                        text="Open Themes Folder"
                                        action={() => showItemInFolder(themeDir!)}
                                        disabled={themeDirPending}
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

                            {Settings.plugins.ClientTheme.enabled && (
                                <QuickAction
                                    text="Edit ClientTheme"
                                    action={() => openPluginModal(Plugins.ClientTheme)}
                                    Icon={PencilIcon}
                                />
                            )}
                        </>
                    </QuickActionCard>

                    <div className={cl("grid")}>
                        {userThemes?.map(({ type, header: theme }: ThemeHeader) => (
                            type === "other" ? (
                                <OtherThemeCard
                                    key={theme.fileName}
                                    enabled={settings.enabledThemes.includes(theme.fileName)}
                                    onChange={enabled => onLocalThemeChange(theme.fileName, enabled)}
                                    onDelete={async () => {
                                        onLocalThemeChange(theme.fileName, false);
                                        await VencordNative.themes.deleteTheme(theme.fileName);
                                        refreshLocalThemes();
                                    }}
                                    theme={theme as UserThemeHeader}
                                />
                            ) : (
                                <UserCSSThemeCard
                                    key={theme.fileName}
                                    enabled={settings.enabledThemes.includes(theme.fileName)}
                                    onChange={enabled => onLocalThemeChange(theme.fileName, enabled)}
                                    onDelete={async () => {
                                        onLocalThemeChange(theme.fileName, false);
                                        await VencordNative.themes.deleteTheme(theme.fileName);
                                        refreshLocalThemes();
                                    }}
                                    onSettingsReset={refreshLocalThemes}
                                    theme={theme as UserstyleHeader}
                                />
                            )))}
                    </div>
                </Forms.FormSection>
            </>
        );
    }

    function addThemeLink(link: string) {
        if (!themeLinkValid) return;
        if (settings.themeLinks.includes(link)) return;

        settings.themeLinks = [...settings.themeLinks, link];
        setCurrentThemeLink("");
        refreshOnlineThemes();
    }

    async function refreshOnlineThemes() {
        const themes = await Promise.all(
            settings.themeLinks.map(async link => {
                try {
                    const res = await fetch(link);
                    if (!res.ok) throw new Error(`Failed to fetch ${link}`);
                    const css = await res.text();
                    return { ...getThemeInfo(css, link), link };
                } catch (err) {
                    console.warn(`Theme fetch failed for ${link}:`, err);
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

    function deleteThemeLink(link: string) {
        settings.themeLinks = settings.themeLinks.filter(f => f !== link);

        refreshOnlineThemes();
    }

    function OnlineThemes() {

        const themes = (onlineThemes ?? []).map(theme => ({
            ...theme,
            customName: themeNames[theme.link] ?? null,
        }));

        return (
            <>;
                <Forms.FormSection title="Online Themes" tag="h5">
                    <Card className="vc-settings-theme-add-card">
                        <Forms.FormText>Make sure to use direct links to files (raw or github.io)!</Forms.FormText>
                        <Flex flexDirection="row">
                            <TextInput placeholder="Theme Link" className="vc-settings-theme-link-input" value={currentThemeLink} onChange={setCurrentThemeLink} />
                            <Button onClick={() => addThemeLink(currentThemeLink)} disabled={!themeLinkValid}>Add</Button>
                        </Flex>
                        {currentThemeLink && <Validator link={currentThemeLink} onValidate={setThemeLinkValid} />}
                    </Card>

                    <div className={cl("grid")}>
                        {themes.map(theme => {
                            const { label, link } = (() => {
                                const match = /^@(light|dark) (.*)/.exec(theme.link);
                                if (!match) return { label: theme, link: theme };

                                const [, mode, link] = match;
                                return { label: `[${mode} mode only] ${link}`, link };
                            })();

                            return (
                                <OtherThemeCard
                                    key={theme.fileName}
                                    theme={theme}
                                    enabled={settings.enabledThemeLinks.includes(theme.link)}
                                    onChange={enabled => onThemeLinkEnabledChange(theme.link, enabled)}
                                    onDelete={async () => {
                                        onThemeLinkEnabledChange(theme.link, false);
                                        deleteThemeLink(theme.link);
                                    }}
                                    showDeleteButton
                                    onEditName={newName => {
                                        const updatedNames = { ...themeNames, [theme.link]: newName };
                                        setThemeNames(updatedNames);
                                        settings.themeNames = {
                                            ...settings.themeNames,
                                            [theme.link]: newName,
                                        };
                                    }}
                                />
                            );
                        })}
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
                <TabBar.Item
                    className="vc-settings-tab-bar-item"
                    id={ThemeTab.LOCAL}
                >
                    Local Themes
                </TabBar.Item>
                <TabBar.Item
                    className="vc-settings-tab-bar-item"
                    id={ThemeTab.ONLINE}
                >
                    Online Themes
                </TabBar.Item>
            </TabBar>

            <CspErrorCard />
            {currentTab === ThemeTab.LOCAL && <LocalThemes />}
            {currentTab === ThemeTab.ONLINE && <OnlineThemes />}
        </SettingsTab>
    );
}

export function CspErrorCard() {
    if (IS_WEB) return null;

    const errors = useCspErrors();
    const forceUpdate = useForceUpdater();

    if (!errors.length) return null;

    const isImgurHtmlDomain = (url: string) => url.startsWith("https://imgur.com/");

    const allowUrl = async (url: string) => {
        const { origin: baseUrl, host } = new URL(url);

        const result = await VencordNative.csp.requestAddOverride(baseUrl, ["connect-src", "img-src", "style-src", "font-src"], "Vencord Themes");
        if (result !== "ok") return;

        CspBlockedUrls.forEach(url => {
            if (new URL(url).host === host) {
                CspBlockedUrls.delete(url);
            }
        });

        forceUpdate();

        Alerts.show({
            title: "Restart Required",
            body: "A restart is required to apply this change",
            confirmText: "Restart now",
            cancelText: "Later!",
            onConfirm: relaunch
        });
    };

    const hasImgurHtmlDomain = errors.some(isImgurHtmlDomain);

    return (
        <ErrorCard className="vc-settings-card">
            <Forms.FormTitle tag="h5">Blocked Resources</Forms.FormTitle>
            <Forms.FormText>Some images, styles, or fonts were blocked because they come from disallowed domains.</Forms.FormText>
            <Forms.FormText>It is highly recommended to move them to GitHub or Imgur. But you may also allow domains if you fully trust them.</Forms.FormText>
            <Forms.FormText>
                After allowing a domain, you have to fully close (from tray / task manager) and restart {IS_DISCORD_DESKTOP ? "Discord" : IS_EQUIBOP ? "Equibop" : "Vesktop"} to apply the change.
            </Forms.FormText>

            <Forms.FormTitle tag="h5" className={classes(Margins.top16, Margins.bottom8)}>Blocked URLs</Forms.FormTitle>
            <div className="vc-settings-csp-list">
                {errors.map((url, i) => (
                    <div key={url}>
                        {i !== 0 && <Forms.FormDivider className={Margins.bottom8} />}
                        <div className="vc-settings-csp-row">
                            <Link href={url}>{url}</Link>
                            <Button color={Button.Colors.PRIMARY} onClick={() => allowUrl(url)} disabled={isImgurHtmlDomain(url)}>
                                Allow
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {hasImgurHtmlDomain && (
                <>
                    <Forms.FormDivider className={classes(Margins.top8, Margins.bottom16)} />
                    <Forms.FormText>
                        Imgur links should be direct links in the form of <code>https://i.imgur.com/...</code>
                    </Forms.FormText>
                    <Forms.FormText>To obtain a direct link, right-click the image and select "Copy image address".</Forms.FormText>
                </>
            )}
        </ErrorCard>
    );
}

function UserscriptThemesTab() {
    return (
        <SettingsTab title="Themes">
            <Card className="vc-settings-card">
                <Forms.FormTitle tag="h5">Themes are not supported on the Userscript!</Forms.FormTitle>

                <Forms.FormText>
                    You can instead install themes with the <Link href={getStylusWebStoreUrl()}>Stylus extension</Link>!
                </Forms.FormText>
            </Card>
        </SettingsTab>
    );
}

export default IS_USERSCRIPT
    ? wrapTab(UserscriptThemesTab, "Themes")
    : wrapTab(ThemesTab, "Themes");
