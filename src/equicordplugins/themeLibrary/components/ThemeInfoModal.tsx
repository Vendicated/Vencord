/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CodeBlock } from "@components/CodeBlock";
import { Heart } from "@components/Heart";
import { openInviteModal } from "@utils/discord";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import type { PluginNative } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { Button, Clipboard, Forms, Parser, React, showToast, Toasts } from "@webpack/common";

import { Theme, ThemeInfoModalProps } from "../types";
import { ClockIcon, DownloadIcon, WarningIcon } from "../utils/Icons";
import { logger } from "./ThemeTab";

const Native = VencordNative.pluginHelpers.ThemeLibrary as PluginNative<typeof import("../native")>;
const UserSummaryItem = findComponentByCodeLazy("defaultRenderUser", "showDefaultAvatarsForNullUsers");

async function downloadTheme(themesDir: string, theme: Theme) {
    try {
        await Native.downloadTheme(themesDir, theme);
        showToast(`Downloaded ${theme.name}!`, Toasts.Type.SUCCESS);
    } catch (err: unknown) {
        logger.error(err);
        showToast(`Failed to download ${theme.name}! (check console)`, Toasts.Type.FAILURE);
    }
}

export const ThemeInfoModal: React.FC<ThemeInfoModalProps> = ({ author, theme, ...props }) => {
    const { type, content, likes, guild, tags, last_updated, requiresThemeAttributes } = theme;

    const themeContent = window.atob(content);
    const metadata = themeContent.match(/\/\*\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\//g)?.[0] || "";
    const donate = metadata.match(/@donate\s+(.+)/)?.[1] || "";
    const version = metadata.match(/@version\s+(.+)/)?.[1] || "";
    const invite = metadata.match(/@invite\s+(.+)/)?.[1] || "";

    const authors = Array.isArray(author) ? author : [author];

    const lastUpdated = Math.floor(new Date(last_updated ?? 0).getTime() / 1000);

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">{type} Details</Forms.FormTitle>
            </ModalHeader>
            <ModalContent>
                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>{authors.length > 1 ? "Authors" : "Author"}</Forms.FormTitle>
                <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center" }}>
                            <UserSummaryItem
                                users={authors}
                                count={authors.length}
                                guildId={undefined}
                                renderIcon={false}
                                max={4}
                                size={32}
                                showDefaultAvatarsForNullUsers
                                showUserPopout
                                className={Margins.right8}
                            />
                            <Forms.FormText style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {authors.map(author => author.username).join(", ")}
                            </Forms.FormText>
                        </div>
                        {version && (
                            <>
                                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Version</Forms.FormTitle>
                                <Forms.FormText>
                                    {version}
                                </Forms.FormText>
                            </>
                        )}
                        <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Likes</Forms.FormTitle>
                        <Forms.FormText>
                            {likes === 0 ? `Nobody liked this ${type} yet.` : `${likes} users liked this ${type}!`}
                        </Forms.FormText>
                        {donate && (
                            <>
                                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Donate</Forms.FormTitle>
                                <Forms.FormText>
                                    You can support the author by donating below!
                                </Forms.FormText>
                                <Forms.FormText style={{ marginTop: "10px" }}>
                                    <Button onClick={() => VencordNative.native.openExternal(donate)}>
                                        <Heart />
                                        Donate
                                    </Button>
                                </Forms.FormText>
                            </>
                        )}
                        {(guild || invite) && (
                            <>
                                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Support Server</Forms.FormTitle>
                                {guild && (
                                    <Forms.FormText>
                                        {guild.name}
                                    </Forms.FormText>
                                )}
                                <Forms.FormText>
                                    <Button
                                        color={Button.Colors.BRAND_NEW}
                                        look={Button.Looks.FILLED}
                                        className={Margins.top8}
                                        onClick={async e => {
                                            e.preventDefault();
                                            const useInvite = guild ? guild.invite_link?.split("discord.gg/")[1] : invite;
                                            useInvite != null && openInviteModal(useInvite).catch(() => showToast("Invalid or expired invite!", Toasts.Type.FAILURE));
                                        }}
                                    >
                                        Join Discord Server
                                    </Button>
                                </Forms.FormText>
                            </>
                        )}
                        <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Source</Forms.FormTitle>
                        <Forms.FormText>
                            <Button
                                disabled={!theme.content || theme.id === "preview"}
                                onClick={() => openModal(modalProps => (
                                    <ModalRoot {...modalProps} size={ModalSize.LARGE}>
                                        <ModalHeader>
                                            <Forms.FormTitle tag="h4">Theme Source</Forms.FormTitle>
                                        </ModalHeader>
                                        <ModalContent>
                                            <Forms.FormText style={{
                                                padding: "8px",
                                            }}>
                                                <CodeBlock lang="css" content={themeContent} />
                                            </Forms.FormText>
                                        </ModalContent>
                                        <ModalFooter>
                                            <Button
                                                color={Button.Colors.RED}
                                                look={Button.Looks.OUTLINED}
                                                onClick={() => modalProps.onClose()}
                                            >
                                                Close
                                            </Button>
                                            <Button className={Margins.right8}
                                                onClick={() => {
                                                    Clipboard.copy(themeContent);
                                                    showToast("Copied to Clipboard", Toasts.Type.SUCCESS);
                                                }}>Copy to Clipboard</Button>
                                        </ModalFooter>
                                    </ModalRoot>
                                ))}
                            >
                                View Theme Source
                            </Button>
                        </Forms.FormText>
                        {tags && (
                            <>
                                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Tags</Forms.FormTitle>
                                <Forms.FormText>
                                    {tags.map(tag => (
                                        <span className="vce-theme-info-tag">
                                            {tag}
                                        </span>
                                    ))}
                                </Forms.FormText>
                            </>
                        )}
                        {requiresThemeAttributes && (
                            <Forms.FormText style={{ marginTop: "10px" }}>
                                <WarningIcon /> This theme requires the <b>ThemeAttributes</b> plugin!
                            </Forms.FormText>
                        )}
                        {last_updated && (
                            <Forms.FormText style={{ marginTop: "10px" }}>
                                <ClockIcon /> This theme was last updated {Parser.parse("<t:" + lastUpdated + ":F>")} ({Parser.parse("<t:" + lastUpdated + ":R>")})
                            </Forms.FormText>
                        )}
                    </div>
                </div>
            </ModalContent>
            <ModalFooter>
                <Button
                    color={Button.Colors.RED}
                    look={Button.Looks.OUTLINED}
                    onClick={() => props.onClose()}
                >
                    Close
                </Button>
                <Button
                    color={Button.Colors.GREEN}
                    look={Button.Looks.OUTLINED}
                    className={classes("vce-button", Margins.right8)}
                    disabled={!theme.content || theme.id === "preview"}
                    onClick={async () => {
                        const themesDir = await VencordNative.themes.getThemesDir();
                        const exists = await Native.themeExists(themesDir, theme);
                        // using another function so we get the proper file path instead of just guessing
                        // which slash to use (im looking at you windows)
                        const validThemesDir = await Native.getThemesDir(themesDir, theme);
                        // check if theme exists, and ask if they want to overwrite
                        if (exists) {
                            openModal(modalProps => (
                                <ModalRoot {...modalProps} size={ModalSize.SMALL}>
                                    <ModalHeader>
                                        <Forms.FormTitle tag="h4">Conflict!</Forms.FormTitle>
                                    </ModalHeader>
                                    <ModalContent>
                                        <Forms.FormText style={{
                                            padding: "8px",
                                        }}>
                                            <div style={{ display: "flex", flexDirection: "column" }}>
                                                <p>A theme with the same name <b>already exist</b> in your themes directory! Do you want to overwrite it?</p>
                                                <div className="vce-overwrite-modal">
                                                    <code style={{ wordWrap: "break-word" }}>
                                                        {validThemesDir}
                                                    </code>
                                                </div>
                                            </div>
                                        </Forms.FormText>
                                    </ModalContent>
                                    <ModalFooter>
                                        <Button
                                            look={Button.Looks.FILLED}
                                            color={Button.Colors.RED}
                                            onClick={async () => {
                                                await downloadTheme(themesDir, theme);
                                                modalProps.onClose();
                                            }}
                                        >
                                            Overwrite
                                        </Button>
                                        <Button
                                            color={Button.Colors.GREEN}
                                            look={Button.Looks.FILLED}
                                            className={Margins.right8} onClick={() => modalProps.onClose()}
                                        >
                                            Keep my file
                                        </Button>
                                    </ModalFooter>
                                </ModalRoot>
                            ));
                        } else {
                            await downloadTheme(themesDir, theme);
                        }
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center" }}>
                        Download <DownloadIcon style={{ marginLeft: "5px" }} />
                    </div>
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
};
