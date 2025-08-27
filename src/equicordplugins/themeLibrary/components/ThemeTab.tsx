/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import * as DataStore from "@api/DataStore";
import { Settings } from "@api/Settings";
import { ErrorCard } from "@components/ErrorCard";
import { OpenExternalIcon } from "@components/Icons";
import { SettingsTab, wrapTab } from "@components/settings";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { findByPropsLazy } from "@webpack";
import { Button, Forms, React, SearchableSelect, TabBar, TextInput, useEffect, useState } from "@webpack/common";

import { SearchStatus, TabItem, Theme, ThemeLikeProps } from "../types";
import { ThemeCard } from "./ThemeCard";

const InputStyles = findByPropsLazy("inputWrapper", "inputError", "error");

export const apiUrl = "https://discord-themes.com/api";
export const logger = new Logger("ThemeLibrary", "#e5c890");

export async function fetchAllThemes(): Promise<Theme[]> {
    const response = await themeRequest("/themes");
    const data = await response.json();
    const themes: Theme[] = Object.values(data);
    themes.forEach(theme => {
        if (!theme.source) {
            theme.source = `${apiUrl}/${theme.id}`;
        }
    });
    return themes.sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime());
}

export async function themeRequest(path: string, options: RequestInit = {}) {
    return fetch(apiUrl + path, {
        ...options,
        headers: {
            ...options.headers,
        }
    });
}

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

    const onSearch = (query: string) => setSearchValue(prev => ({ ...prev, value: query }));
    const onStatusChange = (status: SearchStatus) => setSearchValue(prev => ({ ...prev, status }));

    const themeFilter = (theme: Theme) => {
        const enabled = themeLinks.includes(`${apiUrl}/${theme.name}`);

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
            const token = await DataStore.get("ThemeLibrary_uniqueToken");
            const response = await themeRequest("/likes/get", {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });
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
    }, []);

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
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "70vh",
                            fontSize: "1.5em",
                            color: "var(--text-default)"
                        }}>
                        <p> Getting the latest themes... </p>
                        <p style={{
                            fontSize: ".75em",
                            color: "var(--text-muted)"
                        }}> This won't take long! </p>

                    </div>
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
                            </ErrorCard>
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
                                <ThemeCard
                                    key={theme.id}
                                    theme={theme}
                                    themeLinks={themeLinks}
                                    likedThemes={likedThemes}
                                    setThemeLinks={setThemeLinks}
                                    removePreview={true}
                                />
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
                                />
                            </div>
                        </div>
                        <div>
                            {filteredThemes.length ? filteredThemes.map((theme: Theme) => (
                                <ThemeCard
                                    key={theme.id}
                                    theme={theme}
                                    themeLinks={themeLinks}
                                    likedThemes={likedThemes}
                                    setThemeLinks={setThemeLinks}
                                />
                            )) : <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}>
                                <p style={{
                                    fontSize: "1em",
                                    color: "var(--text-default)"
                                }}> No theme found. </p>
                                <p style={{
                                    fontSize: ".75em",
                                    color: "var(--text-muted)"
                                }}> Try narrowing your search down. </p>
                            </div>
                            }
                        </div>
                    </>)}
            </>
        </div>
    );
}

// rework this!
function SubmitThemes() {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                height: "70vh",
                fontSize: "1.5em",
                color: "var(--text-default)"
            }}>
            <p> This tab was replaced in favour of the new website: </p>
            <p><a href="https://discord-themes.com" target="_blank" rel="noreferrer">discord-themes.com</a></p>
            <p style={{
                fontSize: ".75em",
                color: "var(--text-muted)"
            }}> Thank you for your understanding!</p>
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
