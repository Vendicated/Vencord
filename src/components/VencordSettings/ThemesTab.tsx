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

import "./styles.css";

import { useSettings } from "@api/settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Link } from "@components/Link";
import { Switch } from "@components/Switch";
import IpcEvents from "@utils/IpcEvents";
import { Margins } from "@utils/margins";
import { useAwaiter } from "@utils/misc";
import { findByCodeLazy, findLazy } from "@webpack";
import { Button, Card, Forms, React, Text, TextArea } from "@webpack/common";
import { UserThemeHeader } from "ipcMain/userThemes";

type FileInput = React.ComponentType<{
    ref: React.Ref<HTMLInputElement>;
    onChange: (e: React.SyntheticEvent<HTMLInputElement>) => void;
    multiple?: boolean;
    filters?: { name?: string; extensions: string[]; }[];
}>;

const TrashIcon = findByCodeLazy("M5 6.99902V18.999C5 20.101 5.897 20.999");
const FileInput: FileInput = findByCodeLazy("activateUploadDialogue=");
const TextAreaProps = findLazy(m => typeof m.textarea === "string");
const TabBar = findByCodeLazy('[role="tab"][aria-disabled="false"]');

const cl = (className: string) => `vc-settings-theme-${className}`;

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
                {themeLinks.map(link => (
                    <Card style={{
                        padding: ".5em",
                        marginBottom: ".5em",
                        marginTop: ".5em"
                    }} key={link}>
                        <Forms.FormTitle tag="h5" style={{
                            overflowWrap: "break-word"
                        }}>
                            {link}
                        </Forms.FormTitle>
                        <Validator link={link} />
                    </Card>
                ))}
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
    function renderLinks() {
        const links: (JSX.Element | string)[] = [];

        if (theme.website) {
            links.push(<Link href={theme.website}>Website</Link>);
        }

        if (theme.invite) {
            const invite = /^[-\w]+$/.test(theme.invite)
                ? `https://discord.gg/${theme.invite}`
                : theme.invite;

            links.push(<Link href={invite}>Discord Server</Link>);
        }

        return links
            .map<React.ReactNode>(t => t) // make TS happy
            .reduce((prev, curr) => [
                prev,
                // Ugly but blame stable for being electron 13.
                // TODO: When stable is on newer electron, remove this stupid ternary and remove the default value ([]) of the reducer.
                (prev as React.ReactNode[]).length ? <span style={{ whiteSpace: "pre-wrap" }}>{", "}</span> : null,
                curr
            ], []);
    }


    return (
        <div className={cl("card")} data-dnd-name={theme.fileName}>
            <Flex flexDirection="row" style={{ justifyContent: "space-between" }}>
                <div style={{ display: "grid" }}>
                    <Text tag="h2" variant="text-md/bold" className={cl("card-text")}>{theme.name}</Text>
                    <Text variant="text-sm/medium" className={cl("card-text")}>By {theme.author}</Text>
                </div>
                <Flex flexDirection="row" style={{ gap: "1em" }}>
                    <Switch checked={enabled} onChange={onChange} />
                    {IS_WEB && (
                        <div style={{ cursor: "pointer", color: "var(--status-danger" }} onClick={onDelete}>
                            <TrashIcon />
                        </div>
                    )}
                </Flex>
            </Flex>
            <div style={{ display: "grid" }}>
                <Text variant="text-sm/normal" className={cl("card-text")}>{theme.description}</Text>
                <Flex flexDirection="row" style={{ gap: 0 }}>
                    {renderLinks()}
                </Flex>
            </div>
        </div>
    );
}

enum ThemeTab {
    LOCAL,
    ONLINE
}

export default ErrorBoundary.wrap(function () {
    const settings = useSettings();

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [currentTab, setCurrentTab] = React.useState(ThemeTab.LOCAL);
    const [themeText, setThemeText] = React.useState(settings.themeLinks.join("\n"));
    const [userThemes, setUserThemes] = React.useState<UserThemeHeader[] | null>(null);
    const [themeDir, , themeDirPending] = useAwaiter(() => VencordNative.ipc.invoke<string>(IpcEvents.GET_THEMES_DIR).catch(() => ""));

    React.useEffect(() => {
        refreshLocalThemes();
    }, []);

    async function refreshLocalThemes() {
        const themes = await VencordNative.ipc.invoke<UserThemeHeader[]>(IpcEvents.GET_THEMES_LIST).catch(() => []);
        setUserThemes(themes);
    }

    // When a local theme is enabled/disabled, update the settings
    function onLocalThemeChange(fileName: string, value: boolean) {
        if (value) {
            if (settings.enabledThemes.includes(fileName)) return;
            settings.enabledThemes = [...settings.enabledThemes, fileName];
        } else {
            settings.enabledThemes = [...settings.enabledThemes.filter(f => f !== fileName)];
        }
    }

    async function onFileUpload(e: React.SyntheticEvent<HTMLInputElement>) {
        e.stopPropagation();
        e.preventDefault();
        if (!e.currentTarget?.files?.length) return;
        const { files } = e.currentTarget;

        const decoder = new TextDecoder("utf-8");

        for (const file of files) {
            const { name } = file;
            if (!name.endsWith(".css")) continue;

            const buffer = await file.arrayBuffer();
            if (!buffer) continue;

            const text = decoder.decode(buffer);
            if (!text) continue;

            VencordNative.ipc.invoke(IpcEvents.UPLOAD_THEME, name, text)
                .then(() => { refreshLocalThemes(); })
                .catch(console.error);
        }
    }

    function renderLocalThemes() {
        return (
            <>
                <Card className="vc-settings-card">
                    <Forms.FormTitle tag="h5">Find Themes:</Forms.FormTitle>
                    <div style={{ marginBottom: ".5em" }}>
                        <Link style={{ marginRight: ".5em" }} href="https://betterdiscord.app/themes">
                            BetterDiscord Themes
                        </Link>
                        <Link href="https://github.com/search?q=discord+theme">GitHub</Link>
                    </div>
                    <Forms.FormText>If using the BD site, click on "Download" and place the downloaded .css file into your themes folder.</Forms.FormText>
                </Card>

                <Forms.FormSection title="Local Themes">
                    <div className={cl("button-flex")}>
                        {IS_WEB ?
                            (
                                <Button
                                    size={Button.Sizes.SMALL}
                                    disabled={themeDirPending}
                                >
                                    Upload Theme
                                    <FileInput
                                        ref={fileInputRef}
                                        onChange={onFileUpload}
                                        multiple={true}
                                        filters={[{ extensions: ["*.css"] }]}
                                    />
                                </Button>
                            ) : (

                                <Button
                                    onClick={() => window.DiscordNative.fileManager.showItemInFolder(themeDir)}
                                    size={Button.Sizes.SMALL}
                                    disabled={themeDirPending}
                                >
                                    Open Themes Folder
                                </Button>
                            )}
                        <Button
                            onClick={refreshLocalThemes}
                            size={Button.Sizes.SMALL}
                        >
                            Refresh Theme List
                        </Button>
                    </div>

                    <div className={cl("grid")}>
                        {userThemes !== null && userThemes.map(theme => (
                            <ThemeCard
                                key={theme.fileName}
                                enabled={settings.enabledThemes.includes(theme.fileName)}
                                onChange={enabled => onLocalThemeChange(theme.fileName, enabled)}
                                onDelete={() => {
                                    onLocalThemeChange(theme.fileName, false);
                                    VencordNative.ipc.invoke(IpcEvents.DELETE_THEME, theme.fileName)
                                        .then(() => { refreshLocalThemes(); });
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
                    <Forms.FormTitle tag="h5">Paste links to .theme.css files here</Forms.FormTitle>
                    <Forms.FormText>One link per line</Forms.FormText>
                    <Forms.FormText>Make sure to use the raw links or github.io links!</Forms.FormText>
                    <Forms.FormDivider className={Margins.top8 + " " + Margins.bottom8} />
                    <Forms.FormTitle tag="h5">Find Themes:</Forms.FormTitle>
                    <div style={{ marginBottom: ".5em" }}>
                        <Link style={{ marginRight: ".5em" }} href="https://betterdiscord.app/themes">
                            BetterDiscord Themes
                        </Link>
                        <Link href="https://github.com/search?q=discord+theme">GitHub</Link>
                    </div>
                    <Forms.FormText>If using the BD site, click on "Source" somewhere below the Download button</Forms.FormText>
                    <Forms.FormText>In the GitHub repository of your theme, find X.theme.css, click on it, then click the "Raw" button</Forms.FormText>
                    <Forms.FormText>
                        If the theme has configuration that requires you to edit the file:
                        <ul>
                            <li>• Make a <Link href="https://github.com/signup">GitHub</Link> account</li>
                            <li>• Click the fork button on the top right</li>
                            <li>• Edit the file</li>
                            <li>• Use the link to your own repository instead</li>
                        </ul>
                    </Forms.FormText>
                </Card>

                <Forms.FormSection title="Online Themes" tag="h5">
                    <TextArea
                        style={{
                            padding: ".5em",
                            border: "1px solid var(--background-modifier-accent)"
                        }}
                        value={themeText}
                        onChange={e => setThemeText(e.currentTarget.value)}
                        className={TextAreaProps.textarea}
                        placeholder="Theme Links"
                        spellCheck={false}
                        onBlur={onBlur}
                    />
                    <Validators themeLinks={settings.themeLinks} />
                </Forms.FormSection>
            </>
        );
    }

    return (
        <>;
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
            </TabBar>;

            {currentTab === ThemeTab.LOCAL && renderLocalThemes()}
            {currentTab === ThemeTab.ONLINE && renderOnlineThemes()}
        </>
    );
});
