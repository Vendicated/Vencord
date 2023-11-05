/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { CopyIcon, DeleteIcon } from "@components/Icons";
import { copyWithToast } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModalLazy } from "@utils/modal";
import { Button, Card, Forms, Text, TextInput, useEffect, useState } from "@webpack/common";
import { getThemeInfo, UserThemeHeader } from "main/themes";

import { AddonCard } from "./AddonCard";
import { ThemeCard } from "./ThemesTab";

export interface OnlineTheme {
    link: string;
    headers?: UserThemeHeader;
    error?: string;
}

const cl = classNameFactory("vc-settings-theme-");

/**
 * Trims URLs like so
 * https://whatever.example.com/whatever/whatever/whatever/whatever/index.html
 * -> whatever/index.html
 */
function trimThemeUrl(url: string) {
    let urlObj: URL;

    try {
        urlObj = new URL(url);
    } catch (e) {
        return url;
    }

    return urlObj.pathname.split("/").slice(-2).join("/");
}

async function FetchTheme(link: string) {
    const theme: OnlineTheme = await fetch(link, { redirect: "follow" })
        .then(res => {
            if (res.status >= 400) throw `${res.status} ${res.statusText}`;

            const contentType = res.headers.get("Content-Type");
            if (!contentType?.startsWith("text/css") && !contentType?.startsWith("text/plain"))
                throw "Not a CSS file. Remember to use the raw link!";

            return res.text();
        })
        .then(text => {
            const headers = getThemeInfo(text, trimThemeUrl(link));
            return { link, headers };
        }).catch(e => {
            return { link, error: e.toString() };
        });

    return theme;
}

export function OnlineThemes() {
    const settings = useSettings(["themeLinks", "disabledThemeLinks"]);
    const [themes, setThemes] = useState<OnlineTheme[]>([]);

    async function fetchThemes() {
        const themes = await Promise.all(settings.themeLinks.map(link => FetchTheme(link)));
        setThemes(themes);
    }

    async function addTheme(link: string) {
        settings.disabledThemeLinks = [...settings.disabledThemeLinks, link];
        settings.themeLinks = [...settings.themeLinks, link];
        setThemes([...themes, await FetchTheme(link)]);
    }

    async function removeTheme(link: string) {
        settings.disabledThemeLinks = settings.disabledThemeLinks.filter(l => l !== link);
        settings.themeLinks = settings.themeLinks.filter(l => l !== link);
        setThemes(themes.filter(t => t.link !== link));
    }

    function setThemeEnabled(link: string, enabled: boolean) {
        if (enabled) {
            settings.disabledThemeLinks = settings.disabledThemeLinks.filter(l => l !== link);
        } else {
            settings.disabledThemeLinks = [...settings.disabledThemeLinks, link];
        }
        settings.themeLinks = [...settings.themeLinks];
    }

    useEffect(() => {
        fetchThemes();
    }, []);

    function AddThemeModal({ transitionState, onClose }: ModalProps) {
        const [disabled, setDisabled] = useState(true);
        const [error, setError] = useState<string | null>(null);
        const [url, setUrl] = useState("");

        async function checkUrl() {
            if (!url) {
                setDisabled(true);
                setError(null);
                return;
            }

            if (themes.some(t => t.link === url)) {
                setError("Theme already added");
                setDisabled(true);
                return;
            }

            let urlObj: URL | undefined = undefined;
            try {
                urlObj = new URL(url);
            } catch (e) {
                setDisabled(true);
                setError("Invalid URL");
                return;
            }

            if (urlObj.hostname !== "raw.githubusercontent.com" && !urlObj.hostname.endsWith("github.io")) {
                setError("Only raw.githubusercontent.com and github.io URLs are allowed, otherwise the theme will not work");
                setDisabled(true);
                return;
            }

            if (!urlObj.pathname.endsWith(".css")) {
                setError("Not a CSS file. Remember to use the raw link!");
                setDisabled(true);
                return;
            }

            let success = true;
            await fetch(url).then(res => {
                if (!res.ok) {
                    setError(`Could not fetch theme: ${res.status} ${res.statusText}`);
                    setDisabled(true);
                    success = false;
                }
            }).catch(e => {
                setError(`Could not fetch theme: ${e}`);
                setDisabled(true);
                success = false;
            });

            if (!success) return;

            setDisabled(false);
            setError(null);
        }

        return <ModalRoot transitionState={transitionState} size={ModalSize.SMALL}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Add Online Theme</Text>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>
            <ModalContent className={cl("add-theme-content")}>
                <Forms.FormText>Only raw.githubusercontent.com and github.io URLs will work</Forms.FormText>

                <TextInput placeholder="URL" name="url" onBlur={checkUrl} onChange={setUrl} />
                <Forms.FormText className={cl("add-theme-error")}>{error}</Forms.FormText>
            </ModalContent>
            <ModalFooter className={cl("add-theme-footer")}>
                <Button onClick={onClose} color={Button.Colors.RED}>Cancel</Button>
                <Button onClick={() => {
                    addTheme(url);
                    onClose();
                }} color={Button.Colors.BRAND} disabled={disabled}>
                    Add
                </Button>
            </ModalFooter>
        </ModalRoot>;
    }

    return (
        <>
            <Card className="vc-settings-card">
                <Forms.FormTitle tag="h5">Find Themes:</Forms.FormTitle>
                <Forms.FormText>
                    Find a theme you like and press "Add Theme" to add it.
                    To get a raw link to a theme, go to it's GitHub repository,
                    find the CSS file, and press the "Raw" button, then copy the URL.
                </Forms.FormText>
            </Card>
            <Forms.FormSection title="Online Themes" tag="h5">
                <Card className="vc-settings-quick-actions-card">
                    <Button onClick={() => openModalLazy(async () => {
                        return modalProps => {
                            return <AddThemeModal {...modalProps} />;
                        };
                    })} size={Button.Sizes.SMALL}>
                        Add Theme
                    </Button>
                    <Button
                        onClick={() => fetchThemes()}
                        size={Button.Sizes.SMALL}
                    >
                        Refresh
                    </Button>
                </Card>
                <div className={cl("grid")}>
                    {themes.length === 0 && (
                        <Forms.FormText>Add themes with the "Add Theme" button above</Forms.FormText>
                    )}
                    {themes.map(theme => (
                        (!theme.error && <ThemeCard
                            key={theme.link}
                            enabled={!settings.disabledThemeLinks.includes(theme.link)}
                            onChange={value => {
                                setThemeEnabled(theme.link, value);
                            }}
                            onDelete={() => removeTheme(theme.link)}
                            theme={theme.headers!}
                            showDelete={true}
                            extraButtons={
                                <div
                                    style={{ cursor: "pointer" }}
                                    onClick={() => copyWithToast(theme.link, "Link copied to clipboard!")}
                                >
                                    <CopyIcon />
                                </div>
                            }
                        />
                        ) || (
                            <AddonCard
                                key={theme.link}
                                name={theme.error}
                                description={theme.link}
                                enabled={false}
                                setEnabled={() => { }}
                                hideSwitch={true}
                                infoButton={<>
                                    <div
                                        style={{ cursor: "pointer" }}
                                        onClick={() => copyWithToast(theme.link, "Link copied to clipboard!")}
                                    >
                                        <CopyIcon />
                                    </div>
                                    <div
                                        style={{ cursor: "pointer", color: "var(--status-danger" }}
                                        onClick={() => removeTheme(theme.link)}
                                    >
                                        <DeleteIcon />
                                    </div>
                                </>
                                }
                            />
                        )
                    ))}
                </div>
            </Forms.FormSection>
        </>
    );
}
