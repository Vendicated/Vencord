/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { generateId } from "@api/Commands";
import { Settings } from "@api/Settings";
import { Card } from "@components/Card";
import { HeadingPrimary, HeadingTertiary } from "@components/Heading";
import { OpenExternalIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import type { Theme, ThemeLikeProps } from "@equicordplugins/themeLibrary/types";
import { proxyLazy } from "@utils/lazy";
import { Margins } from "@utils/margins";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { User } from "@vencord/discord-types";
import { Button, FluxDispatcher, Parser, React, UserStore, UserUtils } from "@webpack/common";
import { Constructor } from "type-fest";

import { LikesComponent } from "./LikesComponent";
import { ThemeInfoModal } from "./ThemeInfoModal";
import { apiUrl } from "./ThemeTab";

interface ThemeCardProps {
    theme: Theme;
    themeLinks: string[];
    likedThemes?: ThemeLikeProps;
    setThemeLinks: (links: string[]) => void;
    removePreview?: boolean;
    removeButtons?: boolean;
}

const UserRecord: Constructor<Partial<User>> = proxyLazy(() => UserStore.getCurrentUser().constructor) as any;

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

export const ThemeCard: React.FC<ThemeCardProps> = ({ theme, themeLinks, likedThemes, setThemeLinks, removeButtons, removePreview }) => {

    const getUser = (id: string, username: string) => UserUtils.getUser(id) ?? makeDummyUser({ username, id });

    const handleAddRemoveTheme = () => {
        const onlineThemeLinks = themeLinks.includes(`${apiUrl}/${theme.id}`)
            ? themeLinks.filter(link => link !== `${apiUrl}/${theme.id}`)
            : [...themeLinks, `${apiUrl}/${theme.id}`];

        setThemeLinks(onlineThemeLinks);
        Settings.themeLinks = onlineThemeLinks;
    };

    const handleThemeAttributesCheck = () => {
        const requiresThemeAttributes = theme.requiresThemeAttributes ?? false;

        if (requiresThemeAttributes && !Settings.plugins.ThemeAttributes.enabled) {
            openModal(modalProps => (
                <ModalRoot {...modalProps} size={ModalSize.SMALL}>
                    <ModalHeader>
                        <HeadingTertiary>Hold on!</HeadingTertiary>
                    </ModalHeader>
                    <ModalContent>
                        <Paragraph style={{ padding: "8px" }}>
                            <p>This theme requires the <b>ThemeAttributes</b> plugin to work properly!</p>
                            <p>Do you want to enable it?</p>
                        </Paragraph>
                    </ModalContent>
                    <ModalFooter>
                        <Button
                            look={Button.Looks.FILLED}
                            color={Button.Colors.GREEN}
                            onClick={() => {
                                Settings.plugins.ThemeAttributes.enabled = true;
                                modalProps.onClose();
                                handleAddRemoveTheme();
                            }}
                        >
                            Enable Plugin
                        </Button>
                        <Button
                            color={Button.Colors.RED}
                            look={Button.Looks.FILLED}
                            className={Margins.right8}
                            onClick={() => modalProps.onClose()}
                        >
                            Cancel
                        </Button>
                    </ModalFooter>
                </ModalRoot>
            ));
        } else {
            handleAddRemoveTheme();
        }
    };

    const handleViewSource = () => {
        const content = window.atob(theme.content);
        const metadata = content.match(/\/\*\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\//g)?.[0] || "";
        const source = metadata.match(/@source\s+(.+)/)?.[1] || "";

        if (source) {
            VencordNative.native.openExternal(source);
        } else {
            VencordNative.native.openExternal(`${apiUrl}/${theme.id}`);
        }
    };

    return (
        <Card style={{ padding: ".5rem", marginBottom: ".5em", marginTop: ".5em", display: "flex", flexDirection: "column", backgroundColor: "var(--background-base-lower-alt)" }} key={theme.id}>
            <HeadingPrimary style={{ overflowWrap: "break-word", marginTop: 8 }} className="vce-theme-text">
                {theme.name}
            </HeadingPrimary>
            <Paragraph className="vce-theme-text">
                {Parser.parse(theme.description)}
            </Paragraph>
            {!removePreview && (
                <img role="presentation" src={theme.thumbnail_url} loading="lazy" alt={theme.name} className="vce-theme-info-preview" />
            )}
            <div className="vce-theme-info">
                <div style={{ justifyContent: "flex-start", flexDirection: "column" }}>
                    {theme.tags && (
                        <Paragraph>
                            {theme.tags.map(tag => (
                                <span className="vce-theme-info-tag" key={tag}>
                                    {tag}
                                </span>
                            ))}
                        </Paragraph>
                    )}
                    {!removeButtons && (
                        <div style={{ marginTop: "8px", display: "flex", flexDirection: "row" }}>
                            <Button
                                onClick={handleThemeAttributesCheck}
                                size={Button.Sizes.MEDIUM}
                                color={themeLinks.includes(`${apiUrl}/${theme.id}`) ? Button.Colors.RED : Button.Colors.GREEN}
                                look={Button.Looks.FILLED}
                                className={Margins.right8}
                                disabled={!theme.content || theme.id === "preview"}
                            >
                                {themeLinks.includes(`${apiUrl}/${theme.id}`) ? "Remove Theme" : "Add Theme"}
                            </Button>
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
                                onClick={handleViewSource}
                                size={Button.Sizes.MEDIUM}
                                color={Button.Colors.LINK}
                                look={Button.Looks.LINK}
                                disabled={!theme.content || theme.id === "preview"}
                                style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                                View Source <OpenExternalIcon height={16} width={16} />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </Card >
    );
};
