/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { generateId } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { Settings } from "@api/Settings";
import { CodeBlock } from "@components/CodeBlock";
import { ErrorCard } from "@components/ErrorCard";
import { OpenExternalIcon } from "@components/Icons";
import { SettingsTab, wrapTab } from "@components/VencordSettings/shared";
import { proxyLazy } from "@utils/lazy";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { findByPropsLazy } from "@webpack";
import { Button, Card, FluxDispatcher, Forms, Parser, React, SearchableSelect, TabBar, TextArea, TextInput, Toasts, useEffect, UserStore, UserUtils, useState } from "@webpack/common";
import { User } from "discord-types/general";
import { Constructor } from "type-fest";

import { SearchStatus, TabItem, Theme, ThemeLikeProps } from "../types";
import { isAuthorized } from "../utils/auth";
import { LikesComponent } from "./LikesComponent";
import { ThemeInfoModal } from "./ThemeInfoModal";

const InputStyles = findByPropsLazy("inputDefault", "inputWrapper", "error");
const UserRecord: Constructor<Partial<User>> = proxyLazy(() => UserStore.getCurrentUser().constructor) as any;

const API_URL = "https://themes-delta.vercel.app/api";

const logger = new Logger("ThemeLibrary", "#e5c890");

export async function fetchAllThemes(): Promise<Theme[]> {
    const response = await themeRequest("/themes");
    const data = await response.json();
    const themes: Theme[] = Object.values(data);
    themes.forEach(theme => {
        if (!theme.source) {
            theme.source = `${API_URL}/${theme.name}`;
        }
    });
    return themes.sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime());
}

export async function themeRequest(path: string, options: RequestInit = {}) {
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

const SearchTags = {
    [SearchStatus.THEME]: "THEME",
    [SearchStatus.SNIPPET]: "SNIPPET",
    [SearchStatus.LIKED]: "LIKED",
    [SearchStatus.DARK]: "DARK",
    [SearchStatus.LIGHT]: "LIGHT",
};


function ThemeTab() {
    const [themes, setThemes] = useState<Theme[]>([]);
    const [filteredThemes, setFilteredThemes] = useState<Theme[]>([]);
    const [themeLinks, setThemeLinks] = useState(Vencord.Settings.themeLinks);
    const [likedThemes, setLikedThemes] = useState<ThemeLikeProps>();
    const [searchValue, setSearchValue] = useState({ value: "", status: SearchStatus.ALL });
    const [hideWarningCard, setHideWarningCard] = useState(Settings.plugins.ThemeLibrary.hideWarningCard);
    const [loading, setLoading] = useState(true);

    const getUser = (id: string, username: string) => UserUtils.getUser(id) ?? makeDummyUser({ username, id });
    const onSearch = (query: string) => setSearchValue(prev => ({ ...prev, value: query }));
    const onStatusChange = (status: SearchStatus) => setSearchValue(prev => ({ ...prev, status }));

    const themeFilter = (theme: Theme) => {
        const enabled = themeLinks.includes(`${API_URL}/${theme.name}`);
        const tags = new Set(theme.tags.map(tag => tag?.toLowerCase()));

        if (!enabled && searchValue.status === SearchStatus.ENABLED) return false;

        const anyTags = SearchTags[searchValue.status];
        if (anyTags && !tags.has(anyTags?.toLowerCase())) return false;

        if ((enabled && searchValue.status === SearchStatus.DISABLED) || (!enabled && searchValue.status === SearchStatus.ENABLED)) return false;

        if (!searchValue.value.length) return true;

        const v = searchValue.value?.toLowerCase();
        return (
            theme.name?.toLowerCase().includes(v) ||
            theme.description?.toLowerCase().includes(v) ||
            (Array.isArray(theme.author) ? theme.author.some(author => author.discord_name?.toLowerCase()?.includes(v)) : theme.author.discord_name?.toLowerCase()?.includes(v)) ||
            tags.has(v)
        );
    };

    const fetchLikes = async () => {
        try {
            const response = await themeRequest("/likes/get");
            const data = await response.json();
            return data;
        } catch (err) {
            logger.error(err);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [themes, likes] = await Promise.all([fetchAllThemes(), fetchLikes()]);
                setThemes(themes);
                setLikedThemes(likes);
                setFilteredThemes(themes);
            } catch (err) {
                logger.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        setThemeLinks(Vencord.Settings.themeLinks);
    }, [Vencord.Settings.themeLinks]);

    useEffect(() => {
        // likes only update after 12_000 due to cache
        if (searchValue.status === SearchStatus.LIKED) {
            const likedThemes = themes.sort((a, b) => b.likes - a.likes);
            // replacement of themeFilter which wont work with SearchStatus.LIKED
            const filteredLikedThemes = likedThemes.filter(x => x.name.includes(searchValue.value));
            setFilteredThemes(filteredLikedThemes);
        } else {
            const sortedThemes = themes.sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime());
            const filteredThemes = sortedThemes.filter(themeFilter);
            setFilteredThemes(filteredThemes);
        }
    }, [searchValue, themes]);

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
                        }}>Loading themes...</div>
                ) : (
                    <>
                        {hideWarningCard ? null : (
                            <ErrorCard>
                                <Forms.FormTitle tag="h4">Want your theme removed?</Forms.FormTitle>
                                <Forms.FormText className={Margins.top8}>
                                    If you want your theme(s) permanently removed, please open an issue on <a href="https://github.com/Faf4a/plugins/issues/new?labels=removal&projects=&template=request_removal.yml&title=Theme+Removal">GitHub <OpenExternalIcon height={16} width={16} /></a>
                                </Forms.FormText>
                                <Button
                                    onClick={() => {
                                        Settings.plugins.ThemeLibrary.hideWarningCard = true;
                                        setHideWarningCard(true);
                                    }}
                                    size={Button.Sizes.SMALL}
                                    color={Button.Colors.RED}
                                    look={Button.Looks.FILLED}
                                    className={classes(Margins.top16, "vce-warning-button")}
                                >Hide</Button>
                            </ErrorCard >
                        )}
                        <div className={classes(Margins.bottom8, Margins.top16)}>
                            <Forms.FormTitle tag="h2"
                                style={{
                                    overflowWrap: "break-word",
                                    marginTop: 8,
                                }}>
                                {searchValue.status === SearchStatus.LIKED ? "Most Liked" : "Newest Additions"}
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
                                        {Parser.parse(theme.description)}
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
                                                {themeLinks.includes(`${API_URL}/${theme.name}`) ? (
                                                    <Button
                                                        onClick={() => {
                                                            const onlineThemeLinks = themeLinks.filter(x => x !== `${API_URL}/${theme.name}`);
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
                                                            const onlineThemeLinks = [...themeLinks, `${API_URL}/${theme.name}`];

                                                            const requiresThemeAttributes = theme.requiresThemeAttributes ?? false;

                                                            if (requiresThemeAttributes && !Settings.plugins.ThemeAttributes.enabled) {
                                                                openModal(modalProps => (
                                                                    <ModalRoot {...modalProps} size={ModalSize.SMALL}>
                                                                        <ModalHeader>
                                                                            <Forms.FormTitle tag="h4">Hold on!</Forms.FormTitle>
                                                                        </ModalHeader>
                                                                        <ModalContent>
                                                                            <Forms.FormText style={{
                                                                                padding: "8px",
                                                                            }}>
                                                                                <div style={{ display: "flex", flexDirection: "column" }}>
                                                                                    <p>This theme requires the <b>ThemeAttributes</b> plugin to work properly!</p>
                                                                                    <p>
                                                                                        Do you want to enable it?
                                                                                    </p>
                                                                                </div>
                                                                            </Forms.FormText>
                                                                        </ModalContent>
                                                                        <ModalFooter>
                                                                            <Button
                                                                                look={Button.Looks.FILLED}
                                                                                color={Button.Colors.GREEN}
                                                                                onClick={async () => {
                                                                                    Settings.plugins.ThemeAttributes.enabled = true;
                                                                                    modalProps.onClose();
                                                                                    setThemeLinks(onlineThemeLinks);
                                                                                    Vencord.Settings.themeLinks = onlineThemeLinks;
                                                                                }}
                                                                            >
                                                                                Enable Plugin
                                                                            </Button>
                                                                            <Button
                                                                                color={Button.Colors.RED}
                                                                                look={Button.Looks.FILLED}
                                                                                className={Margins.right8} onClick={() => modalProps.onClose()}
                                                                            >
                                                                                Cancel
                                                                            </Button>
                                                                        </ModalFooter>
                                                                    </ModalRoot>
                                                                ));
                                                            } else {
                                                                setThemeLinks(onlineThemeLinks);
                                                                Vencord.Settings.themeLinks = onlineThemeLinks;
                                                            }
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
                                                        const authors = Array.isArray(theme.author)
                                                            ? await Promise.all(theme.author.map(author => getUser(author.discord_snowflake, author.discord_name)))
                                                            : [await getUser(theme.author.discord_snowflake, theme.author.discord_name)];

                                                        openModal(props => <ThemeInfoModal {...props} author={authors} theme={theme} />);
                                                    }}
                                                    size={Button.Sizes.MEDIUM}
                                                    color={Button.Colors.BRAND}
                                                    look={Button.Looks.FILLED}
                                                >
                                                    Theme Info
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        const content = window.atob(theme.content);
                                                        const metadata = content.match(/\/\*\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\//g)?.[0] || "";
                                                        const source = metadata.match(/@source\s+(.+)/)?.[1] || "";

                                                        if (source) {
                                                            VencordNative.native.openExternal(source);
                                                        } else {
                                                            VencordNative.native.openExternal(`${API_URL}/${theme.name}`);
                                                        }
                                                    }}
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
                        <div className={classes(Margins.bottom20, "vce-search-grid")}>
                            <TextInput value={searchValue.value} placeholder="Search for a theme..." onChange={onSearch} />
                            <div className={InputStyles.inputWrapper}>
                                <SearchableSelect
                                    options={[
                                        { label: "Show All", value: SearchStatus.ALL, default: true },
                                        { label: "Show Themes", value: SearchStatus.THEME },
                                        { label: "Show Snippets", value: SearchStatus.SNIPPET },
                                        { label: "Show Most Liked", value: SearchStatus.LIKED },
                                        { label: "Show Dark", value: SearchStatus.DARK },
                                        { label: "Show Light", value: SearchStatus.LIGHT },
                                        { label: "Show Enabled", value: SearchStatus.ENABLED },
                                        { label: "Show Disabled", value: SearchStatus.DISABLED },
                                    ]}
                                    // @ts-ignore
                                    value={searchValue.status}
                                    clearable={false}
                                    onChange={v => onStatusChange(v as SearchStatus)}
                                    closeOnSelect={true}
                                    className={InputStyles.inputDefault}
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
                                        {Parser.parse(theme.description)}
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
                                                {themeLinks.includes(`${API_URL}/${theme.name}`) ? (
                                                    <Button
                                                        onClick={() => {
                                                            const onlineThemeLinks = themeLinks.filter(x => x !== `${API_URL}/${theme.name}`);
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
                                                            const onlineThemeLinks = [...themeLinks, `${API_URL}/${theme.name}`];

                                                            const requiresThemeAttributes = theme.requiresThemeAttributes ?? false;

                                                            if (requiresThemeAttributes && !Settings.plugins.ThemeAttributes.enabled) {
                                                                openModal(modalProps => (
                                                                    <ModalRoot {...modalProps} size={ModalSize.SMALL}>
                                                                        <ModalHeader>
                                                                            <Forms.FormTitle tag="h4">Hold on!</Forms.FormTitle>
                                                                        </ModalHeader>
                                                                        <ModalContent>
                                                                            <Forms.FormText style={{
                                                                                padding: "8px",
                                                                            }}>
                                                                                <div style={{ display: "flex", flexDirection: "column" }}>
                                                                                    <p>This theme requires the <b>ThemeAttributes</b> plugin to work properly!</p>
                                                                                    <p>
                                                                                        Do you want to enable it?
                                                                                    </p>
                                                                                </div>
                                                                            </Forms.FormText>
                                                                        </ModalContent>
                                                                        <ModalFooter>
                                                                            <Button
                                                                                look={Button.Looks.FILLED}
                                                                                color={Button.Colors.GREEN}
                                                                                onClick={async () => {
                                                                                    Settings.plugins.ThemeAttributes.enabled = true;
                                                                                    modalProps.onClose();
                                                                                    setThemeLinks(onlineThemeLinks);
                                                                                    Vencord.Settings.themeLinks = onlineThemeLinks;
                                                                                }}
                                                                            >
                                                                                Enable Plugin
                                                                            </Button>
                                                                            <Button
                                                                                color={Button.Colors.RED}
                                                                                look={Button.Looks.FILLED}
                                                                                className={Margins.right8} onClick={() => modalProps.onClose()}
                                                                            >
                                                                                Cancel
                                                                            </Button>
                                                                        </ModalFooter>
                                                                    </ModalRoot>
                                                                ));
                                                            } else {
                                                                setThemeLinks(onlineThemeLinks);
                                                                Vencord.Settings.themeLinks = onlineThemeLinks;
                                                            }
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
                                                        const authors = Array.isArray(theme.author)
                                                            ? await Promise.all(theme.author.map(author => getUser(author.discord_snowflake, author.discord_name)))
                                                            : [await getUser(theme.author.discord_snowflake, theme.author.discord_name)];

                                                        openModal(props => <ThemeInfoModal {...props} author={authors} theme={theme} />);
                                                    }}
                                                    size={Button.Sizes.MEDIUM}
                                                    color={Button.Colors.BRAND}
                                                    look={Button.Looks.FILLED}
                                                >
                                                    Theme Info
                                                </Button>
                                                <LikesComponent themeId={theme.id} likedThemes={likedThemes} />
                                                <Button
                                                    onClick={() => {
                                                        const content = window.atob(theme.content);
                                                        const metadata = content.match(/\/\*\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\//g)?.[0] || "";
                                                        const source = metadata.match(/@source\s+(.+)/)?.[1] || "";

                                                        if (source) {
                                                            VencordNative.native.openExternal(source);
                                                        } else {
                                                            VencordNative.native.openExternal(`${API_URL}/${theme.name}`);
                                                        }
                                                    }}
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
    const [themeContent, setContent] = useState("");
    const handleChange = (v: string) => setContent(v);

    return (
        <div className={classes(Margins.bottom8, Margins.top16)}>
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
            <Forms.FormText className={classes(Margins.bottom16, Margins.top8)}>
                <CodeBlock lang="css" content={themeTemplate} />
            </Forms.FormText>
            <Forms.FormTitle tag="h2" style={{
                overflowWrap: "break-word",
                marginTop: 8,
            }}>
                Submit Themes
            </Forms.FormTitle>
            <Forms.FormText className={Margins.bottom16}>
                If you plan on updating your theme / snippet frequently, consider using an <code>@import</code> instead!
            </Forms.FormText>
            <Forms.FormText>
                <TextArea
                    content={themeTemplate}
                    onChange={handleChange}
                    className={"vce-text-input"}
                    placeholder={themeTemplate}
                    spellCheck={false}
                    rows={35}
                />
                <div style={{ display: "flex", alignItems: "center" }}>
                    <Button
                        onClick={async () => {
                            if (!(await isAuthorized())) return;

                            if (themeContent.length < 50) return Toasts.show({
                                message: "Failed to submit theme, content must be at least 50 characters long.",
                                id: Toasts.genId(),
                                type: Toasts.Type.FAILURE,
                                options: {
                                    duration: 5e3,
                                    position: Toasts.Position.TOP
                                }
                            });

                            const token = await DataStore.get("ThemeLibrary_uniqueToken");

                            themeRequest("/submit/theme", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    token,
                                    content: window.btoa(themeContent),
                                }),
                            }).then(async response => {
                                if (!response.ok) {
                                    const res = await response.json();
                                    Toasts.show({
                                        message: `Failed to submit theme, ${res.message}`,
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
                            }).catch(error => {
                                logger.error("Failed to submit theme", error);
                                Toasts.show({
                                    message: "Failed to submit theme, check your console!",
                                    type: Toasts.Type.FAILURE,
                                    id: Toasts.genId(),
                                    options: {
                                        duration: 5e3,
                                        position: Toasts.Position.BOTTOM
                                    }
                                });
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
                        Abusing this feature will result in you being blocked from further submissions.
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
