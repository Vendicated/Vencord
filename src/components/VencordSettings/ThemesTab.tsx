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
import { ErrorCard } from "@components/ErrorCard";
import { Flex } from "@components/Flex";
import { DeleteIcon, FolderIcon, PaintbrushIcon, PencilIcon, PlusIcon, RestartIcon } from "@components/Icons";
import { Link } from "@components/Link";
import { openPluginModal } from "@components/PluginSettings/PluginModal";
import type { UserThemeHeader } from "@main/themes";
import { CspBlockedUrls, useCspErrors } from "@utils/cspViolations";
import { openInviteModal } from "@utils/discord";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { relaunch } from "@utils/native";
import { useAwaiter, useForceUpdater } from "@utils/react";
import { getStylusWebStoreUrl } from "@utils/web";
import { findLazy } from "@webpack";
import { Alerts, Button, Card, Forms, React, showToast, TabBar, TextArea, useEffect, useRef, useState } from "@webpack/common";
import type { ComponentType, Ref, SyntheticEvent } from "react";

import Plugins from "~plugins";

import { AddonCard } from "./AddonCard";
import { QuickAction, QuickActionCard } from "./quickActions";
import { SettingsTab, wrapTab } from "./shared";

type FileInput = ComponentType<{
    ref: Ref<HTMLInputElement>;
    onChange: (e: SyntheticEvent<HTMLInputElement>) => void;
    multiple?: boolean;
    filters?: { name?: string; extensions: string[]; }[];
}>;

const FileInput: FileInput = findLazy(m => m.prototype?.activateUploadDialogue && m.prototype.setRef);

const cl = classNameFactory("vc-settings-theme-");

function Validator({ link }: { link: string; }) {
    const [res, err, pending] = useAwaiter(() => fetch(link).then(res => {
        if (res.status > 300) throw `${res.status} ${res.statusText}`;
        const contentType = res.headers.get("Content-Type");
        if (!contentType?.startsWith("text/css") && !contentType?.startsWith("text/plain"))
            throw "Not a CSS file. Remember to use the raw link!";

        return "Okay!";
    }));

    const text = pending
        ? "Checking..."
        : err
            ? `Error: ${err instanceof Error ? err.message : String(err)}`
            : "Valid!";

    return <Forms.FormText style={{
        color: pending ? "var(--text-muted)" : err ? "var(--text-danger)" : "var(--text-positive)"
    }}>{text}</Forms.FormText>;
}

function Validators({ themeLinks }: { themeLinks: string[]; }) {
    if (!themeLinks.length) return null;

    return (
        <>
            <Forms.FormTitle className={Margins.top20} tag="h5">Validator</Forms.FormTitle>
            <Forms.FormText>This section will tell you whether your themes can successfully be loaded</Forms.FormText>
            <div>
                {themeLinks.map(rawLink => {
                    const { label, link } = (() => {
                        const match = /^@(light|dark) (.*)/.exec(rawLink);
                        if (!match) return { label: rawLink, link: rawLink };

                        const [, mode, link] = match;
                        return { label: `[${mode} mode only] ${link}`, link };
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
    const settings = useSettings(["themeLinks", "enabledThemes"]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentTab, setCurrentTab] = useState(ThemeTab.LOCAL);
    const [themeText, setThemeText] = useState(settings.themeLinks.join("\n"));
    const [userThemes, setUserThemes] = useState<UserThemeHeader[] | null>(null);

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
        return (
            <>
                <Card className="vc-settings-card vc-text-selectable">
                    <Forms.FormTitle tag="h5">Paste links to css files here</Forms.FormTitle>
                    <Forms.FormText>One link per line</Forms.FormText>
                    <Forms.FormText>You can prefix lines with @light or @dark to toggle them based on your Discord theme</Forms.FormText>
                    <Forms.FormText>Make sure to use direct links to files (raw or github.io)!</Forms.FormText>
                </Card>

                <Forms.FormSection title="Online Themes" tag="h5">
                    <TextArea
                        value={themeText}
                        onChange={setThemeText}
                        className={"vc-settings-theme-links"}
                        placeholder="Theme Links"
                        spellCheck={false}
                        onBlur={onBlur}
                        rows={10}
                    />
                    <Validators themeLinks={settings.themeLinks} />
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
            {currentTab === ThemeTab.LOCAL && renderLocalThemes()}
            {currentTab === ThemeTab.ONLINE && renderOnlineThemes()}
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
                After allowing a domain, you have to fully close (from tray / task manager) and restart {IS_DISCORD_DESKTOP ? "Discord" : "Vesktop"} to apply the change.
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
