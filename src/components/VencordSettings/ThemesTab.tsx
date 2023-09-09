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
import { Link } from "@components/Link";
import { Margins } from "@utils/margins";
import { classes, identity } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { showItemInFolder } from "@utils/native";
import { LazyComponent, useAwaiter } from "@utils/react";
import type { ThemeHeader } from "@utils/themes";
import { getThemeInfo, stripBOM, type UserThemeHeader } from "@utils/themes/bd";
import { usercssParse } from "@utils/themes/usercss";
import { find, findByCodeLazy, findByPropsLazy, findLazy } from "@webpack";
import { Button, Card, ComponentTypes, FluxDispatcher, Forms, Popout, React, Select, showToast, Slider, Switch, TabBar, Text, TextArea, TextInput, useEffect, useRef, useState } from "@webpack/common";
import type { ComponentType, ReactNode, Ref, SyntheticEvent } from "react";
import type { UserstyleHeader } from "usercss-meta";

import { AddonCard } from "./AddonCard";
import { SettingsTab, wrapTab } from "./shared";

type FileInput = ComponentType<{
    ref: Ref<HTMLInputElement>;
    onChange: (e: SyntheticEvent<HTMLInputElement>) => void;
    multiple?: boolean;
    filters?: { name?: string; extensions: string[]; }[];
}>;

interface ColorPickerProps {
    value: number | null;
    showEyeDropper?: boolean;
    onChange(value: number | null): void;
    onClose?(): void;
}

const ColorPickerModal = LazyComponent<ColorPickerProps>(() => find(m => m?.type?.toString?.().includes(".showEyeDropper")));

const InviteActions = findByPropsLazy("resolveInvite");
const TrashIcon = findByCodeLazy("M5 6.99902V18.999C5 20.101 5.897 20.999");
const CogWheel = findByCodeLazy("18.564C15.797 19.099 14.932 19.498 14 19.738V22H10V19.738C9.069");
const FileInput: FileInput = findByCodeLazy("activateUploadDialogue=");
// TinyColor is completely unmangled and it's duplicated in two modules! Fun!
const TinyColor: tinycolor.Constructor = findByCodeLazy("this._gradientType=");
const TextAreaProps = findLazy(m => typeof m.textarea === "string");

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

function ColorPicker(props: ColorPickerProps) {
    const [color, setColor] = useState(props.value);

    return (
        <Popout
            renderPopout={() => (
                <ColorPickerModal value={props.value} onChange={value => { setColor(value); props.onChange(value); }} showEyeDropper={props.showEyeDropper} />
            )}
        >
            {popoutProps => (
                <div {...popoutProps} style={{
                    width: "2em",
                    height: "2em",
                    cursor: "pointer",
                    backgroundColor: color ? `#${color.toString(16).padStart(6, "0")}` : "var(--background-secondary)",
                    borderRadius: ".125em",
                    border: "1px solid var(--background-tertiary)",
                }}></div>
            )}
        </Popout>
    );
}

interface UserCSSSettingsModalProps {
    modalProps: ModalProps;
    theme: UserstyleHeader;
}

function UserCSSSettingsModal({ modalProps, theme }: UserCSSSettingsModalProps) {
    // @ts-expect-error UseSettings<> can't determine this is a valid key
    const themeSettings = useSettings(["userCssVars"], false).userCssVars[theme.id];

    const controls: ReactNode[] = [];

    function updateSetting(key: string, value: string, setValue: (value: string) => void) {
        themeSettings[key] = value;
        setValue(value);
    }

    for (const [name, varInfo] of Object.entries(theme.vars)) {
        switch (varInfo.type) {
            case "text": {
                const [value, setValue] = useState(themeSettings[name]);

                controls.push(
                    <Forms.FormSection>
                        <Forms.FormTitle tag="h5">{varInfo.label}</Forms.FormTitle>
                        <TextInput
                            key={name}
                            value={value}
                            onChange={v => updateSetting(name, v, setValue)}
                        />
                    </Forms.FormSection>
                );
                break;
            }

            case "checkbox": {
                const [value, setValue] = useState(themeSettings[name]);

                controls.push(
                    <Forms.FormSection>
                        <Switch
                            key={name}
                            value={value === "1"}
                            onChange={value => updateSetting(name, value ? "1" : "0", setValue)}
                            hideBorder
                            style={{ marginBottom: "0.5em" }}
                        >
                            {varInfo.label}
                        </Switch>
                    </Forms.FormSection>
                );
                break;
            }

            case "color": {
                const [value, setValue] = useState(themeSettings[name]);

                const normalizedValue = TinyColor(value).toHex();

                controls.push(
                    <Forms.FormSection>
                        <Forms.FormTitle tag="h5">{varInfo.label}</Forms.FormTitle>
                        <ColorPicker
                            key={name}
                            value={parseInt(normalizedValue, 16)}
                            onChange={v => updateSetting(name, "#" + (v?.toString(16).padStart(6, "0") ?? "000000"), setValue)}
                        />
                    </Forms.FormSection>
                );
                break;
            }

            case "number": {
                const [value, setValue] = useState(themeSettings[name]);

                controls.push(
                    <Forms.FormSection>
                        <Forms.FormTitle tag="h5">{varInfo.label}</Forms.FormTitle>
                        <TextInput
                            type="number"
                            pattern="-?[0-9]+"
                            key={name}
                            value={value}
                            onChange={v => updateSetting(name, v, setValue)}
                        />
                    </Forms.FormSection>
                );
                break;
            }

            case "select": {
                const [value, setValue] = useState(themeSettings[name]);

                const options = varInfo.options.map(option => ({
                    disabled: false,

                    key: option.name,
                    value: option.value,
                    default: varInfo.default === option.value,
                    label: option.label
                } as ComponentTypes.SelectOption));

                controls.push(
                    <Forms.FormSection>
                        <Forms.FormTitle tag="h5">{varInfo.label}</Forms.FormTitle>
                        <Select
                            placeholder={varInfo.label}
                            key={name}
                            options={options}
                            closeOnSelect={true}

                            select={v => updateSetting(name, v, setValue)}
                            isSelected={v => v === value}
                            serialize={identity}
                        />
                    </Forms.FormSection>
                );
                break;
            }

            case "range": {
                const [value, setValue] = useState(themeSettings[name]);

                const markers: number[] = [];

                // defaults taken from https://github.com/openstyles/stylus/wiki/Writing-UserCSS#default-value
                for (let i = (varInfo.min ?? 0); i <= (varInfo.max ?? 10); i += (varInfo.step ?? 1)) {
                    markers.push(i);
                }

                controls.push(
                    <Forms.FormSection>
                        <Forms.FormTitle tag="h5">{varInfo.label} ({varInfo.units})</Forms.FormTitle>
                        <Slider
                            initialValue={parseInt(value, 10)}
                            defaultValue={varInfo.default}
                            onValueChange={v => updateSetting(name, v.toString(), setValue)}
                            minValue={varInfo.min}
                            maxValue={varInfo.max}

                            markers={markers}
                            stickToMarkers={true}
                        />
                    </Forms.FormSection>
                );
                break;
            }
        }
    }

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader separator={false}>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Settings for {theme.name}</Text>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>
            <ModalContent>
                <Flex flexDirection="column" style={{ gap: 12, marginBottom: 16 }}>{controls}</Flex>
            </ModalContent>
        </ModalRoot>
    );
}

interface BDThemeCardProps {
    theme: UserThemeHeader;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    onDelete: () => void;
}

interface UserCSSCardProps {
    theme: UserstyleHeader;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    onDelete: () => void;
}

function UserCSSThemeCard({ theme, enabled, onChange, onDelete }: UserCSSCardProps) {
    return (
        <AddonCard
            name={theme.name ?? "Unknown"}
            description={theme.description}
            author={theme.author ?? "Unknown"}
            enabled={enabled}
            setEnabled={onChange}
            infoButton={
                <>
                    {theme.vars && (
                        <div style={{ cursor: "pointer" }} onClick={
                            () => openModal(modalProps =>
                                <UserCSSSettingsModal modalProps={modalProps} theme={theme} />)
                        }>
                            <CogWheel />
                        </div>
                    )}
                    {IS_WEB && (
                        <div style={{ cursor: "pointer", color: "var(--status-danger" }} onClick={onDelete}>
                            <TrashIcon />
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

function BDThemeCard({ theme, enabled, onChange, onDelete }: BDThemeCardProps) {
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
                        <TrashIcon />
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
                                const { invite } = await InviteActions.resolveInvite(theme.invite, "Desktop Modal");
                                if (!invite) return showToast("Invalid or expired invite");

                                FluxDispatcher.dispatch({
                                    type: "INVITE_MODAL_OPEN",
                                    invite,
                                    code: theme.invite,
                                    context: "APP"
                                });
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
    const [userThemes, setUserThemes] = useState<ThemeHeader[] | null>(null);
    const [themeDir, , themeDirPending] = useAwaiter(VencordNative.themes.getThemesDir);

    useEffect(() => {
        refreshLocalThemes();
    }, []);

    async function refreshLocalThemes() {
        const themes = await VencordNative.themes.getThemesList();

        const themeInfo: ThemeHeader[] = [];

        for (const { fileName, content } of themes) {
            if (!fileName.endsWith(".css")) continue;

            if (fileName.endsWith(".user.css")) {
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
                        case "select":
                            normalizedValue = varInfo.default;
                            break;
                        case "checkbox":
                            normalizedValue = varInfo.default ? "1" : "0";
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
                    type: "bd",
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

                <Forms.FormSection title="Local Themes">
                    <Card className="vc-settings-quick-actions-card">
                        <>
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
                            <Button
                                onClick={refreshLocalThemes}
                                size={Button.Sizes.SMALL}
                            >
                                Load missing Themes
                            </Button>
                            <Button
                                onClick={() => VencordNative.quickCss.openEditor()}
                                size={Button.Sizes.SMALL}
                            >
                                Edit QuickCSS
                            </Button>
                        </>
                    </Card>

                    <div className={cl("grid")}>
                        {userThemes?.map(({ type, header: theme }: ThemeHeader) => (
                            type === "bd" ? (
                                <BDThemeCard
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
                                    theme={theme as UserstyleHeader}
                                />
                            )))}
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
                    <Forms.FormText>Make sure to use direct links to files (raw or github.io)!</Forms.FormText>
                </Card>

                <Forms.FormSection title="Online Themes" tag="h5">
                    <TextArea
                        value={themeText}
                        onChange={setThemeText}
                        className={classes(TextAreaProps.textarea, "vc-settings-theme-links")}
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

            {currentTab === ThemeTab.LOCAL && renderLocalThemes()}
            {currentTab === ThemeTab.ONLINE && renderOnlineThemes()}
        </SettingsTab>
    );
}

export default wrapTab(ThemesTab, "Themes");
