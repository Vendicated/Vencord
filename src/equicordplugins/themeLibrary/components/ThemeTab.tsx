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
import { SettingsTab, wrapTab } from "@components/VencordSettings/shared";
import { fetchUserProfile } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { findByPropsLazy } from "@webpack";
import { Button, Forms, React, SearchableSelect, Switch, TabBar, Text, TextArea, TextInput, Toasts, useEffect, UserProfileStore, UserStore, useState, useStateFromStores } from "@webpack/common";

import { Contributor, SearchStatus, TabItem, Theme, ThemeLikeProps } from "../types";
import { isAuthorized } from "../utils/auth";
import { ThemeCard } from "./ThemeCard";

const InputStyles = findByPropsLazy("inputDefault", "inputWrapper", "error");

export const apiUrl = "https://themes-delta.vercel.app/api";
export const logger = new Logger("ThemeLibrary", "#e5c890");

export async function fetchAllThemes(): Promise<Theme[]> {
    const response = await themeRequest("/themes");
    const data = await response.json();
    const themes: Theme[] = Object.values(data);
    themes.forEach(theme => {
        if (!theme.source) {
            theme.source = `${apiUrl}/${theme.name}`;
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
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "70vh",
                            fontSize: "1.5em",
                            color: "var(--text-normal)"
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
                                    className={InputStyles.inputDefault}
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
                                    color: "var(--text-normal)"
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
    const currentUser = UserStore.getCurrentUser();
    const currentUserProfile = useStateFromStores([UserProfileStore], () => UserProfileStore.getUserProfile(currentUser.id));

    if (!currentUserProfile && currentUser.id) fetchUserProfile(currentUser.id);

    const [theme, setTheme] = useState({
        title: "",
        description: "",
        content: "",
        version: "",
        type: "theme",
        attribution: {
            include_github: false,
            sourceLink: "",
            donationLink: "",
            contributors: [{
                username: currentUser.username,
                id: currentUser.id,
                avatar: currentUser.getAvatarURL(),
                github_username: currentUserProfile.connectedAccounts.find(x => x.type === "github")?.name ?? null,
            }],
            // isAllowedToRedistribute: false,
        },
        screenshotMetadata: {
            data: "",
            name: "",
            size: 0,
        }
    });
    const [valid, setValid] = useState(false);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const image = e.target.files[0];
        const reader = new FileReader();

        reader.onloadend = () => {
            const imgElement = new Image();
            imgElement.src = reader.result as string;

            imgElement.onload = () => {
                const canvas = document.createElement("canvas");
                const maxWidth = 800;
                const scaleSize = maxWidth / imgElement.width;

                canvas.width = maxWidth;
                canvas.height = imgElement.height * scaleSize;

                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

                    const resizedBase64String = canvas.toDataURL("image/jpeg", 0.7);

                    handleChange("screenshotMetadata", {
                        data: resizedBase64String,
                        name: image.name,
                        size: image.size,
                    });
                    setValid(!!theme.title && theme.content.length >= 50 && !!theme.version && !!theme.description);
                }
            };
        };

        reader.readAsDataURL(image);
    };

    const handleChange = (p, v) => {
        setTheme(prevTheme => {
            const [first, ...rest] = p.split(".");

            const updateNestedObject = (obj, keys, value) => {
                const key = keys[0];
                if (keys.length === 1) {
                    return { ...obj, [key]: value };
                }

                return {
                    ...obj,
                    [key]: updateNestedObject(obj[key] || {}, keys.slice(1), value)
                };
            };

            return updateNestedObject(prevTheme, [first, ...rest], v);
        });
    };


    const setContributors = contributors => {
        setTheme(prevTheme => ({
            ...prevTheme,
            attribution: {
                ...prevTheme.attribution,
                contributors: [prevTheme.attribution.contributors[0], ...contributors]
            }
        }));
    };

    useEffect(() => {
        logger.debug(valid);
    }, [theme]);

    return (
        <div className={classes(Margins.bottom8, Margins.top16)}>
            <Forms.FormTitle tag="h2" style={{
                overflowWrap: "break-word",
                marginTop: 8,
                marginBottom: 8,
            }}>
                Submission Guidelines
            </Forms.FormTitle>
            <Text>
                <ul className="vce-styled-list">
                    <li>Do not distribute themes or snippets that aren't yours.</li>
                    <li>Your submission must be at least 50 characters long.</li>
                    <li>Do not submit low-quality themes or snippets.</li>
                </ul>
                <Text color="text-muted" style={{
                    overflowWrap: "break-word",
                    marginTop: 8,
                }} variant="heading-sm/medium">
                    Fields with <span style={{ color: "var(--status-danger)" }}>*</span> are required!
                </Text>
            </Text>

            <div style={{ display: "flex", alignItems: "center", marginTop: 16, marginBottom: 16 }}>
                <div style={{ flex: 5, marginRight: 8 }}>
                    <Forms.FormTitle tag="h2" style={{
                        overflowWrap: "break-word",
                        marginTop: 8,
                        marginBottom: 8,
                    }}>
                        {theme.type.charAt(0).toUpperCase()}{theme.type.slice(1)} Name <span style={{ color: "var(--status-danger)" }}>*</span>
                    </Forms.FormTitle>
                    <TextInput
                        onChange={e => { }}
                        onBlur={e => {
                            const v = e.target.value;
                            handleChange("title", v);
                            setValid(!!theme.title && !!v && theme.content.length >= 50 && !!theme.version && !!theme.description && !!theme.screenshotMetadata.data);
                        }}
                        placeholder={`My awesome ${theme.type}`}
                        rows={1}
                    />
                </div>
                <div style={{ flex: 2 }}>
                    <Forms.FormTitle tag="h2" style={{
                        overflowWrap: "break-word",
                        marginTop: 8,
                        marginBottom: 8,
                    }}>
                        {theme.type.charAt(0).toUpperCase()}{theme.type.slice(1)} Version <span style={{ color: "var(--status-danger)" }}>*</span>
                    </Forms.FormTitle>
                    <TextInput
                        onChange={e => { }}
                        onBlur={e => {
                            const v = e.target.value;
                            handleChange("version", v);
                            setValid(!!theme.title && theme.content.length >= 50 && !!v && !!theme.description && !!theme.screenshotMetadata.data);
                        }}
                        placeholder="v1.0.0"
                        rows={1}
                    />
                </div>
            </div>

            <Forms.FormTitle tag="h2" style={{
                overflowWrap: "break-word",
                marginTop: 8,
                marginBottom: 8,
            }}>
                {theme.type.charAt(0).toUpperCase()}{theme.type.slice(1)} Description <span style={{ color: "var(--status-danger)" }}>*</span></Forms.FormTitle>
            <Text color="text-muted" style={{
                overflowWrap: "break-word",
                marginBottom: 8,
            }} variant="heading-sm/medium">
                Try to keep your description short and to the point.
            </Text>
            <TextArea
                onChange={e => { }}
                onBlur={e => {
                    const v = e.target.value;
                    handleChange("description", v);
                    if (v.length < 10) return Toasts.show({
                        message: `${theme.type.charAt(0).toUpperCase()}${theme.type.slice(1)} description must be at least 10 characters long!`,
                        id: Toasts.genId(),
                        type: Toasts.Type.FAILURE,
                        options: {
                            duration: 2e3,
                            position: Toasts.Position.BOTTOM
                        }
                    });
                    setValid(!!theme.title && v.length >= 10 && theme.content.length >= 50 && !!theme.version && !!theme.screenshotMetadata.data);
                }}
                placeholder={`My ${theme.type}..`}
                rows={2}
            />

            <div style={{ marginTop: 16 }}>
                <Switch
                    value={theme.type === "snippet"}
                    onChange={(e: boolean) => {
                        handleChange("type", e ? "snippet" : "theme");
                    }}
                >
                    Snippet
                </Switch>
            </div>

            <Forms.FormTitle tag="h2" style={{
                overflowWrap: "break-word",
                marginTop: 8,
                marginBottom: 8,
            }}>
                {theme.type.charAt(0).toUpperCase()}{theme.type.slice(1)} Content <span style={{ color: "var(--status-danger)" }}>*</span></Forms.FormTitle>
            <TextArea
                onChange={e => { }}
                onBlur={e => {
                    const v = e.target.value;
                    handleChange("content", v);
                    if (v.length < 50) return Toasts.show({
                        message: "Theme content must be at least 50 characters long!",
                        id: Toasts.genId(),
                        type: Toasts.Type.FAILURE,
                        options: {
                            duration: 2e3,
                            position: Toasts.Position.BOTTOM
                        }
                    });
                    setValid(!!theme.title && v.length >= 50 && !!theme.description && !!theme.version && !!theme.screenshotMetadata.data);
                }}
                placeholder="Your CSS here.."
                className={"vce-text-input"}
                rows={8}
            />

            <Forms.FormTitle tag="h1" style={{
                overflowWrap: "break-word",
                marginTop: 16,
                marginBottom: 8,
            }}>Attribution</Forms.FormTitle>

            <Forms.FormTitle tag="h2" style={{
                overflowWrap: "break-word",
                marginTop: 8,
                marginBottom: 8,
            }}>Contributors</Forms.FormTitle>
            <Text color="text-muted" style={{
                overflowWrap: "break-word",
                marginBottom: 8,
            }} variant="heading-sm/medium">
                Contributors are people that contributed to your {theme.type}, they will be displayed on the {theme.type} card.
            </Text>


            <Forms.FormText>
                {theme.attribution.contributors && theme.attribution.contributors.map(contributor => (
                    <div key={contributor.id} style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                        <img src={contributor.avatar} style={{ width: "32px", height: "32px", borderRadius: "50%", marginRight: "8px" }} />
                        <div>
                            <div>{contributor.username === currentUser.username ? contributor.username + " (you)" : contributor.username}</div>
                            <div style={{
                                color: "var(--text-muted)",
                            }}>{contributor.id}</div>
                        </div>
                    </div>
                ))}
            </Forms.FormText>

            <div style={{
                marginTop: "12px",
                marginBottom: "12px"
            }}>
                <Switch
                    value={theme.attribution.include_github}
                    disabled={!theme.attribution.contributors.find(x => x.github_username)}
                    onChange={(e: boolean) => {
                        handleChange("attribution.include_github", e);
                    }}
                >
                    Include the GitHub usernames of contributors{" "}
                    <span style={{
                        color: "var(--text-muted)",
                        fontSize: "14px",
                    }}>
                        (this will be automatically fetched from their profile connections)
                    </span>.
                </Switch>
            </div>
            <TextArea
                onBlur={e => {
                    const users = e.target.value.trim()
                        .split(",").map(s => s.trim());

                    let valid = true;
                    let newContributors: Contributor[] = [];

                    for (const contributor of users) {
                        const user = UserStore.getUser(contributor);
                        if (!user) {
                            Toasts.show({
                                message: `User '${contributor}' doesn't exist`,
                                id: Toasts.genId(),
                                type: Toasts.Type.FAILURE,
                                options: {
                                    duration: 2e3,
                                    position: Toasts.Position.BOTTOM
                                }
                            });
                            valid = false;
                            continue;
                        }

                        const profile = UserProfileStore.getUserProfile(user.id);
                        if (!profile && user.id) fetchUserProfile(user.id);

                        newContributors.push({
                            id: user.id,
                            username: user.username,
                            avatar: user.getAvatarURL(),
                            github_username: profile.connectedAccounts.find(x => x.type === "github")?.name ?? null
                        });
                    }

                    // remove dups
                    newContributors = newContributors.filter((contributor, i, self) => i === self.findIndex(x => x.id === contributor.id));

                    setContributors(newContributors);
                    setValid(!!theme.title && valid && theme.content.length >= 50 && !!theme.version && !!theme.screenshotMetadata.data);
                }}
                onChange={v => { }}
                placeholder="123456789012345, 234567891012345"
                rows={1}
                style={{
                    overflowWrap: "break-word",
                    marginTop: 16,
                }}
            />

            <Forms.FormTitle tag="h2" style={{
                overflowWrap: "break-word",
                marginTop: 16,
                marginBottom: 8,
            }}>
                Source </Forms.FormTitle>
            <Text color="text-muted" style={{
                overflowWrap: "break-word",
                marginBottom: 8,
            }} variant="heading-sm/medium">
                Please limit yourself to trusted sites like GitHub.
            </Text>
            <TextArea
                onChange={e => { }}
                onBlur={e => {
                    const v = e.target.value;
                    if (!v.startsWith("https://") && v !== "") {
                        setValid(false);
                        return Toasts.show({
                            message: "Source link must be a valid URL!",
                            id: Toasts.genId(),
                            type: Toasts.Type.FAILURE,
                            options: {
                                duration: 2e3,
                                position: Toasts.Position.BOTTOM
                            }
                        });
                    }
                    setValid(!!theme.title && theme.description.length >= 10 && theme.content.length >= 50 && !!theme.version && !!theme.screenshotMetadata.data);
                    handleChange("attribution.sourceLink", v);
                }}
                placeholder="https://github.com/..."
                rows={1}
            />
            <Forms.FormTitle tag="h2" style={{
                overflowWrap: "break-word",
                marginTop: 16,
                marginBottom: 8,
            }}>
                Donation Link</Forms.FormTitle>
            <Text color="text-muted" style={{
                overflowWrap: "break-word",
                marginBottom: 8,
            }} variant="heading-sm/medium">
                Please limit yourself to trusted sites.
            </Text>
            <TextArea
                onChange={e => { }}
                onBlur={e => {
                    const v = e.target.value;
                    if (!v.startsWith("https://") && v !== "") {
                        setValid(false);
                        return Toasts.show({
                            message: "Donation link must be a valid URL!",
                            id: Toasts.genId(),
                            type: Toasts.Type.FAILURE,
                            options: {
                                duration: 2e3,
                                position: Toasts.Position.BOTTOM
                            }
                        });
                    }
                    setValid(!!theme.title && theme.description.length >= 10 && theme.content.length >= 50 && !!theme.version && !!theme.screenshotMetadata.data);
                    handleChange("attribution.donationLink", v);
                }}

                placeholder="https://github.com/..."
                rows={1}
            />
            <div className="vce-divider-border" />
            <Forms.FormTitle tag="h2" style={{
                overflowWrap: "break-word",
                marginTop: 16,
            }}>
                Theme Preview <span style={{ color: "var(--status-danger)" }}>*</span>
            </Forms.FormTitle>
            <div
                className="vce-image-paste"
            >
                <Text color="header-primary" variant="heading-md/semibold">
                    Click to select a file!
                </Text>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        opacity: 0,
                        cursor: "pointer",
                    }}
                />
                {theme.screenshotMetadata.data && (
                    <div style={{ marginTop: "20px" }}>
                        <img src={theme.screenshotMetadata.data} style={{ maxWidth: "100%", borderRadius: "10px" }} />
                        <Text color="text-muted" variant="heading-sm/medium">
                            {theme.screenshotMetadata.name} ({(theme.screenshotMetadata.size! / 1024).toFixed(2)} KB)
                        </Text>
                    </div>
                )}
            </div>
            <div className="vce-divider-border" />
            <div style={{
                marginTop: "16px"
            }}>
                {(!theme.attribution.donationLink && valid) && (
                    <p style={{
                        fontSize: "16px",
                        marginTop: "8px",
                        marginLeft: "8px",
                        color: "var(--status-danger)"
                    }}>
                        You do not have a <b>donation link</b> set. Consider adding one.
                    </p>
                )}
                {(!theme.attribution.sourceLink && valid) && (
                    <p style={{
                        fontSize: "16px",
                        marginTop: "8px",
                        marginBottom: "8px",
                        marginLeft: "8px",
                        color: "var(--status-danger)"
                    }}>
                        You do not have a <b>source link</b> set. Consider adding one, even if it's just your github profile!
                    </p>
                )}
            </div>
            <Forms.FormText>
                <div style={{ display: "flex", alignItems: "center" }}>
                    <Button
                        onClick={async () => {
                            await isAuthorized();

                            const token = await DataStore.get("ThemeLibrary_uniqueToken");

                            if (!token) return;

                            if (!theme.attribution.include_github) {
                                // @ts-ignore -- too lazy to type this
                                theme.attribution.contributors = theme.attribution.contributors.map(contributor => {
                                    const { github_username, ...rest } = contributor;
                                    return rest;
                                });
                            }

                            await themeRequest("/submit/theme", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    token,
                                    title: theme.title,
                                    type: theme.type,
                                    description: theme.description,
                                    version: theme.description,
                                    content: theme.content,
                                    attribution: theme.attribution,
                                    screenshotMetadata: theme.screenshotMetadata
                                })
                            }).then(async response => {
                                if (!response.ok) {
                                    const res = await response.json();
                                    logger.debug(theme);
                                    return Toasts.show({
                                        message: res.message,
                                        id: Toasts.genId(),
                                        type: Toasts.Type.FAILURE,
                                        options: {
                                            duration: 5e3,
                                            position: Toasts.Position.BOTTOM
                                        }
                                    });
                                } else {
                                    Toasts.show({
                                        message: "Theme submitted successfully!",
                                        id: Toasts.genId(),
                                        type: Toasts.Type.SUCCESS,
                                        options: {
                                            duration: 3.5e3,
                                            position: Toasts.Position.BOTTOM
                                        }
                                    });
                                    setTheme({
                                        title: "",
                                        description: "",
                                        content: "",
                                        version: "",
                                        type: "theme",
                                        attribution: {
                                            sourceLink: "",
                                            donationLink: "",
                                            include_github: false,
                                            contributors: [{
                                                username: currentUser.username,
                                                id: currentUser.id,
                                                avatar: currentUser.getAvatarURL(),
                                                github_username: currentUserProfile.connectedAccounts.find(x => x.type === "github")?.name ?? null,
                                            }],
                                            // isAllowedToRedistribute: false,
                                        },
                                        screenshotMetadata: {
                                            data: "",
                                            name: "",
                                            size: 0,
                                        }
                                    });
                                }
                            }).catch(err => {
                                return Toasts.show({
                                    message: err.message,
                                    id: Toasts.genId(),
                                    type: Toasts.Type.FAILURE,
                                    options: {
                                        duration: 5e3,
                                        position: Toasts.Position.BOTTOM
                                    }
                                });
                            });
                            logger.debug(theme);
                        }}
                        size={Button.Sizes.MEDIUM}
                        color={Button.Colors.GREEN}
                        look={Button.Looks.FILLED}
                        className={Margins.top16}
                        disabled={!valid}
                    >
                        Submit
                    </Button>
                    <Button
                        size={Button.Sizes.MEDIUM}
                        color={Button.Colors.BRAND}
                        look={Button.Looks.FILLED}
                        className={Margins.top16}
                        style={{
                            marginLeft: "8px"
                        }}
                        disabled={!valid}
                        onClick={() => {
                            openModal(props => (
                                <ModalRoot {...props} size={ModalSize.LARGE}>
                                    <ModalHeader>
                                        <Forms.FormTitle tag="h4">Preview</Forms.FormTitle>
                                    </ModalHeader>
                                    <ModalContent>
                                        <ThemeCard
                                            theme={{
                                                id: "preview",
                                                name: theme.title,
                                                type: theme.type,
                                                release_date: new Date(),
                                                description: theme.description,
                                                content: "",
                                                version: theme.version,
                                                author: theme.attribution.contributors.map(x => {
                                                    return {
                                                        discord_name: x.username,
                                                        discord_snowflake: x.id,
                                                        github_name: undefined,
                                                    };
                                                }),
                                                tags: [theme.type],
                                                likes: 124,
                                                thumbnail_url: theme.screenshotMetadata.data,
                                            }}
                                            themeLinks={[]}
                                            // @ts-ignore
                                            setLikedThemes={() => { }}
                                            removeButtons={false}
                                        />
                                    </ModalContent>
                                    <ModalFooter>
                                        <Button onClick={props.onClose} size={Button.Sizes.MEDIUM} color={Button.Colors.RED} look={Button.Looks.FILLED}>
                                            Close
                                        </Button>
                                    </ModalFooter>
                                </ModalRoot>
                            ));
                        }}
                    >
                        Preview
                    </Button>
                    <p style={{
                        color: "var(--text-muted)",
                        fontSize: "12px",
                        marginTop: "8px",
                        marginLeft: "12px",
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
