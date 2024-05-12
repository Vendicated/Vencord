/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* eslint-disable indent */
import "./styles.css";

import { generateId } from "@api/Commands";
import { Settings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { CodeBlock } from "@components/CodeBlock";
import { OpenExternalIcon } from "@components/Icons";
import { SettingsTab, wrapTab } from "@components/VencordSettings/shared";
import { proxyLazy } from "@utils/lazy";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { openModal } from "@utils/modal";
import { findByPropsLazy, findLazy } from "@webpack";
import { Button, Card, FluxDispatcher, Forms, React, Select, showToast, TabBar, TextArea, TextInput, Toasts, useEffect, UserStore, UserUtils, useState } from "@webpack/common";
import { User } from "discord-types/general";
import { Constructor } from "type-fest";

import { SearchStatus, TabItem, Theme } from "../types";
import { ThemeInfoModal } from "./ThemeInfoModal";

const cl = classNameFactory("vc-plugins-");
const InputStyles = findByPropsLazy("inputDefault", "inputWrapper");
const UserRecord: Constructor<Partial<User>> = proxyLazy(() => UserStore.getCurrentUser().constructor) as any;
const TextAreaProps = findLazy(m => typeof m.textarea === "string");

const API_URL = "https://themes-delta.vercel.app/api";

async function fetchThemes(url: string): Promise<Theme[]> {
    const response = await fetch(url);
    const data = await response.json();
    const themes: Theme[] = Object.values(data);
    themes.forEach(theme => {
        if (!theme.source) {
            theme.source = `${API_URL}/${theme.name}`;
        } else {
            theme.source = theme.source.replace("?raw=true", "") + "?raw=true";
        }
    });
    return themes.sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime());
}

function API_TYPE(theme, returnAll?: boolean) {
    if (!theme) return;
    const settings = Settings.plugins.ThemeLibrary.domain ?? false;

    if (returnAll) {
        const url = settings ? "https://raw.githubusercontent.com/Faf4a/plugins/main/assets/meta.json" : `${API_URL}/themes`;
        return fetchThemes(url);
    } else {
        return settings ? theme.source : `${API_URL}/${theme.name}`;
    }
}

async function themeRequest(path: string, options: RequestInit = {}) {
    return fetch(API_URL + path, {
        ...options,
        headers: {
            ...options.headers,
        }
    });
}

function makeDummyUser(user: { username: string; id?: string; avatar?: string; }) {
    const newUser = new UserRecord({
        username: user.username,
        id: user.id ?? generateId(),
        avatar: user.avatar,
        bot: true,
    });
    FluxDispatcher.dispatch({
        type: "USER_UPDATE",
        user: newUser,
    });
    return newUser;
}

const themeTemplate = `/**
* @name [Theme name]
* @author [Your name]
* @description [Your Theme Description]
* @version [Your Theme Version]
* @donate [Optionally, your Donation Link]
* @tags [Optionally, tags that apply to your theme]
* @invite [Optionally, your Support Server Invite]
* @source [Optionally, your source code link]
*/

/* Your CSS goes here */
`;

function ThemeTab() {
    const [themes, setThemes] = useState<Theme[]>([]);
    const [filteredThemes, setFilteredThemes] = useState<Theme[]>([]);
    const [themeLinks, setThemeLinks] = useState(Vencord.Settings.themeLinks);
    const [searchValue, setSearchValue] = useState({ value: "", status: SearchStatus.ALL });
    const [loading, setLoading] = useState(true);

    const getUser = (id: string, username: string) => UserUtils.getUser(id) ?? makeDummyUser({ username, id });
    const onSearch = (query: string) => setSearchValue(prev => ({ ...prev, value: query }));
    const onStatusChange = (status: SearchStatus) => setSearchValue(prev => ({ ...prev, status }));

    const themeFilter = (theme: Theme) => {
        const enabled = themeLinks.includes(API_TYPE(theme));
        if (enabled && searchValue.status === SearchStatus.DISABLED) return false;
        if (!theme.tags.includes("theme") && searchValue.status === SearchStatus.THEME) return false;
        if (!theme.tags.includes("snippet") && searchValue.status === SearchStatus.SNIPPET) return false;
        if (!theme.tags.includes("dark") && searchValue.status === SearchStatus.DARK) return false;
        if (!theme.tags.includes("light") && searchValue.status === SearchStatus.LIGHT) return false;
        if (!enabled && searchValue.status === SearchStatus.ENABLED) return false;
        if (!searchValue.value.length) return true;

        const v = searchValue.value.toLowerCase();
        return (
            theme.name.toLowerCase().includes(v) ||
            theme.description.toLowerCase().includes(v) ||
            theme.author.discord_name.toLowerCase().includes(v) ||
            theme.tags?.some(t => t.toLowerCase().includes(v))
        );
    };

    useEffect(() => {
        Promise.resolve(API_TYPE({}, true)).then(themes => {
            setThemes(themes);
            setFilteredThemes(themes);
            setLoading(false);
        }).catch(err => {
            console.error("Failed to load 'ThemeLibrary'", err);
            setLoading(true);
        });
    }, []);

    useEffect(() => {
        setThemeLinks(Vencord.Settings.themeLinks);
    }, [Vencord.Settings.themeLinks]);


    useEffect(() => {
        const filteredThemes = themes.filter(themeFilter);
        setFilteredThemes(filteredThemes);
    }, [searchValue]);

    return (
        <div>
            <>
                {loading ? (
                    <div
                        className={Margins.top20}
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "100%",
                            fontSize: "1.5em",
                            color: "var(--text-muted)"
                        }}>Loading Themes...</div>
                ) : (<>
                    <div className={`${Margins.bottom8} ${Margins.top16}`}>
                        <Forms.FormTitle tag="h2"
                            style={{
                                overflowWrap: "break-word",
                                marginTop: 8,
                            }}>
                            Newest Additions
                        </Forms.FormTitle>

                        {themes.slice(0, 2).map((theme: Theme) => (
                            <Card style={{
                                padding: ".5rem",
                                marginBottom: ".5em",
                                marginTop: ".5em",
                                display: "flex",
                                flexDirection: "column",
                                backgroundColor: "var(--background-secondary-alt)"
                            }} key={theme.id}>
                                <Forms.FormTitle tag="h2" style={{
                                    overflowWrap: "break-word",
                                    marginTop: 8,
                                }}
                                    className="vce-theme-text">
                                    {theme.name}
                                </Forms.FormTitle>
                                <Forms.FormText className="vce-theme-text">
                                    {theme.description}
                                </Forms.FormText>
                                <div className="vce-theme-info">
                                    <div style={{
                                        justifyContent: "flex-start",
                                        flexDirection: "column"
                                    }}>
                                        {theme.tags && (
                                            <Forms.FormText>
                                                {theme.tags.map(tag => (
                                                    <span className="vce-theme-info-tag">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </Forms.FormText>
                                        )}
                                        <div style={{ marginTop: "8px", display: "flex", flexDirection: "row" }}>
                                            {themeLinks.includes(API_TYPE(theme)) ? (
                                                <Button
                                                    onClick={() => {
                                                        const onlineThemeLinks = themeLinks.filter(x => x !== API_TYPE(theme));
                                                        setThemeLinks(onlineThemeLinks);
                                                        Vencord.Settings.themeLinks = onlineThemeLinks;
                                                    }}
                                                    size={Button.Sizes.MEDIUM}
                                                    color={Button.Colors.RED}
                                                    look={Button.Looks.FILLED}
                                                    className={Margins.right8}
                                                >
                                                    Remove Theme
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={() => {
                                                        const onlineThemeLinks = [...themeLinks, API_TYPE(theme)];
                                                        setThemeLinks(onlineThemeLinks);
                                                        Vencord.Settings.themeLinks = onlineThemeLinks;
                                                    }}
                                                    size={Button.Sizes.MEDIUM}
                                                    color={Button.Colors.GREEN}
                                                    look={Button.Looks.FILLED}
                                                    className={Margins.right8}
                                                >
                                                    Add Theme
                                                </Button>
                                            )}
                                            <Button
                                                onClick={async () => {
                                                    const author = await getUser(theme.author.discord_snowflake, theme.author.discord_name);
                                                    openModal(props => <ThemeInfoModal {...props} author={author} theme={theme} />);
                                                }}
                                                size={Button.Sizes.MEDIUM}
                                                color={Button.Colors.BRAND}
                                                look={Button.Looks.FILLED}
                                            >
                                                Theme Info
                                            </Button>
                                            <Button
                                                onClick={() => VencordNative.native.openExternal(API_TYPE(theme).replace("?raw=true", ""))}
                                                size={Button.Sizes.MEDIUM}
                                                color={Button.Colors.LINK}
                                                look={Button.Looks.LINK}
                                                style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                                            >
                                                View Source <OpenExternalIcon height={16} width={16} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                    <Forms.FormTitle tag="h2" style={{
                        overflowWrap: "break-word",
                        marginTop: 20,
                    }}>
                        Themes
                    </Forms.FormTitle>
                    <div className={cl("filter-controls")}>
                        <TextInput value={searchValue.value} placeholder="Search for a theme..." onChange={onSearch} />
                        <div className={InputStyles.inputWrapper}>
                            <Select
                                options={[
                                    { label: "Show All", value: SearchStatus.ALL, default: true },
                                    { label: "Show Themes", value: SearchStatus.THEME },
                                    { label: "Show Snippets", value: SearchStatus.SNIPPET },
                                    { label: "Show Enabled", value: SearchStatus.ENABLED },
                                    { label: "Show Disabled", value: SearchStatus.DISABLED },
                                    { label: "Show Dark", value: SearchStatus.DARK },
                                    { label: "Show Light", value: SearchStatus.LIGHT },
                                ]}
                                serialize={String}
                                select={onStatusChange}
                                isSelected={v => v === searchValue.status}
                                closeOnSelect={true}
                            />
                        </div>
                    </div>
                    <div>
                        {filteredThemes.map((theme: Theme) => (
                            <Card style={{
                                padding: ".5rem",
                                marginBottom: ".5em",
                                marginTop: ".5em",
                                display: "flex",
                                flexDirection: "column",
                                backgroundColor: "var(--background-secondary-alt)"
                            }} key={theme.id}>
                                <Forms.FormTitle tag="h2" style={{
                                    overflowWrap: "break-word",
                                    marginTop: 8,
                                }}
                                    className="vce-theme-text">
                                    {theme.name}
                                </Forms.FormTitle>
                                <Forms.FormText className="vce-theme-text">
                                    {theme.description}
                                </Forms.FormText>
                                <img
                                    role="presentation"
                                    src={theme.thumbnail_url}
                                    loading="lazy"
                                    alt={theme.name}
                                    className="vce-theme-info-preview"
                                />
                                <div className="vce-theme-info">
                                    <div style={{
                                        justifyContent: "flex-start",
                                        flexDirection: "column"
                                    }}>
                                        {theme.tags && (
                                            <Forms.FormText>
                                                {theme.tags.map(tag => (
                                                    <span className="vce-theme-info-tag">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </Forms.FormText>
                                        )}
                                        <div style={{ marginTop: "8px", display: "flex", flexDirection: "row" }}>
                                            {themeLinks.includes(API_TYPE(theme)) ? (
                                                <Button
                                                    onClick={() => {
                                                        const onlineThemeLinks = themeLinks.filter(x => x !== API_TYPE(theme));
                                                        setThemeLinks(onlineThemeLinks);
                                                        Vencord.Settings.themeLinks = onlineThemeLinks;
                                                    }}
                                                    size={Button.Sizes.MEDIUM}
                                                    color={Button.Colors.RED}
                                                    look={Button.Looks.FILLED}
                                                    className={Margins.right8}
                                                >
                                                    Remove Theme
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={() => {
                                                        const onlineThemeLinks = [...themeLinks, API_TYPE(theme)];
                                                        setThemeLinks(onlineThemeLinks);
                                                        Vencord.Settings.themeLinks = onlineThemeLinks;
                                                    }}
                                                    size={Button.Sizes.MEDIUM}
                                                    color={Button.Colors.GREEN}
                                                    look={Button.Looks.FILLED}
                                                    className={Margins.right8}
                                                >
                                                    Add Theme
                                                </Button>
                                            )}
                                            <Button
                                                onClick={async () => {
                                                    const author = await getUser(theme.author.discord_snowflake, theme.author.discord_name);
                                                    openModal(props => <ThemeInfoModal {...props} author={author} theme={theme} />);
                                                }}
                                                size={Button.Sizes.MEDIUM}
                                                color={Button.Colors.BRAND}
                                                look={Button.Looks.FILLED}
                                            >
                                                Theme Info
                                            </Button>
                                            <Button
                                                onClick={() => VencordNative.native.openExternal(API_TYPE(theme).replace("?raw=true", ""))}
                                                size={Button.Sizes.MEDIUM}
                                                color={Button.Colors.LINK}
                                                look={Button.Looks.LINK}
                                                style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                                            >
                                                View Source <OpenExternalIcon height={16} width={16} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </>)}
            </>
        </div >
    );
}

function SubmitThemes() {
    const currentUser = UserStore.getCurrentUser();
    const [themeContent, setContent] = useState("");

    const handleChange = (v: string) => setContent(v);

    return (
        <div className={`${Margins.bottom8} ${Margins.top16}`}>
            <Forms.FormTitle tag="h2" style={{
                overflowWrap: "break-word",
                marginTop: 8,
            }}>
                Theme Guidelines
            </Forms.FormTitle>
            <Forms.FormText>
                Follow the formatting for your CSS to get credit for your theme. You can find the template below.
            </Forms.FormText>
            <Forms.FormText>
                (your theme will be reviewed and can take up to 24 hours to be approved)
            </Forms.FormText>
            <Forms.FormText className={`${Margins.bottom16} ${Margins.top8}`}>
                <CodeBlock lang="css" content={themeTemplate} />
            </Forms.FormText>
            <Forms.FormTitle tag="h2" style={{
                overflowWrap: "break-word",
                marginTop: 8,
            }}>
                Submit Themes
            </Forms.FormTitle>
            <Forms.FormText>
                <TextArea
                    content={themeTemplate}
                    onChange={handleChange}
                    className={classes(TextAreaProps.textarea, "vce-text-input")}
                    placeholder="Theme CSS goes here..."
                    spellCheck={false}
                    rows={35}
                />
                <div style={{ display: "flex", alignItems: "center" }}>
                    <Button
                        onClick={() => {
                            if (themeContent.length < 50) return showToast("Theme content is too short, must be above 50", Toasts.Type.FAILURE);

                            themeRequest("/submit/theme", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    userId: `${currentUser.id}`,
                                    content: btoa(themeContent),
                                }),
                            }).then(response => {
                                if (!response.ok) {
                                    Toasts.show({
                                        message: "Failed to submit theme, try again later. Probably ratelimit, wait 2 minutes.",
                                        id: Toasts.genId(),
                                        type: Toasts.Type.FAILURE,
                                        options: {
                                            duration: 5e3,
                                            position: Toasts.Position.BOTTOM
                                        }
                                    });
                                } else {
                                    Toasts.show({
                                        message: "Submitted your theme! Review can take up to 24 hours.",
                                        type: Toasts.Type.SUCCESS,
                                        id: Toasts.genId(),
                                        options: {
                                            duration: 5e3,
                                            position: Toasts.Position.BOTTOM
                                        }
                                    });
                                }
                            }).catch(() => {
                                showToast("Failed to submit theme, try later", Toasts.Type.FAILURE);
                            });
                        }}
                        size={Button.Sizes.MEDIUM}
                        color={Button.Colors.GREEN}
                        look={Button.Looks.FILLED}
                        className={Margins.top16}
                    >
                        Submit
                    </Button>
                    <p style={{
                        color: "var(--text-muted)",
                        fontSize: "12px",
                        marginTop: "8px",
                        marginLeft: "8px",
                    }}>
                        By submitting your theme, you agree to your Discord User ID being processed.
                    </p>
                </div>
            </Forms.FormText>
        </div>
    );
}

function ThemeLibrary() {
    const [currentTab, setCurrentTab] = useState(TabItem.THEMES);

    return (
        <SettingsTab title="Theme Library">
            <TabBar
                type="top"
                look="brand"
                className="vc-settings-tab-bar"
                selectedItem={currentTab}
                onItemSelect={setCurrentTab}
            >
                <TabBar.Item
                    className="vc-settings-tab-bar-item"
                    id={TabItem.THEMES}
                >
                    Themes
                </TabBar.Item>
                <TabBar.Item
                    className="vc-settings-tab-bar-item"
                    id={TabItem.SUBMIT_THEMES}
                >
                    Submit Theme
                </TabBar.Item>
            </TabBar>

            {currentTab === TabItem.THEMES ? <ThemeTab /> : <SubmitThemes />}
        </SettingsTab>
    );
}

export default wrapTab(ThemeLibrary, "Theme Library");
