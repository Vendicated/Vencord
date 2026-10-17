/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CodeBlock } from "@components/CodeBlock";
import { Heading } from "@components/Heading";
import { Heart } from "@components/Heart";
import { Paragraph } from "@components/Paragraph";
import { Theme, ThemeInfoModalProps } from "@equicordplugins/themeLibrary/types";
import { ClockIcon, WarningIcon } from "@equicordplugins/themeLibrary/utils/Icons";
import { copyToClipboard } from "@utils/clipboard";
import { openInviteModal } from "@utils/discord";
import { Margins } from "@utils/margins";
import type { PluginNative } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { Button, Modal, openModal, Parser, React, showToast } from "@webpack/common";

import { logger } from "./ThemeTab";

const Native = VencordNative.pluginHelpers.ThemeLibrary as PluginNative<typeof import("../native")>;
const UserSummaryItem = findComponentByCodeLazy("defaultRenderUser", "showDefaultAvatarsForNullUsers");

async function downloadTheme(theme: Theme) {
    try {
        await Native.downloadTheme(theme);
        showToast({ text: `Downloaded ${theme.name}!`, variant: "success" });
    } catch (err: unknown) {
        logger.error(err);
        showToast({ text: `Failed to download ${theme.name}! (check console)`, variant: "critical" });
    }
}

export const ThemeInfoModal: React.FC<ThemeInfoModalProps> = ({ author, theme, ...props }) => {
    const { name, type, content, likes, guild, tags, last_updated, requiresThemeAttributes } = theme;

    const themeContent = window.atob(content);
    const metadata = themeContent.match(/\/\*\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\//g)?.[0] || "";
    const donate = metadata.match(/@donate\s+(.+)/)?.[1] || "";
    const version = metadata.match(/@version\s+(.+)/)?.[1] || "";
    const invite = metadata.match(/@invite\s+(.+)/)?.[1] || "";

    const authors = Array.isArray(author) ? author : [author];

    const lastUpdated = Math.floor(new Date(last_updated ?? 0).getTime() / 1000);

    return (
        <Modal
            {...props}
            size="md"
            title={`${name} details`}
            actions={[
                {
                    text: "Close",
                    variant: "secondary",
                    onClick: () => props.onClose()
                },
                {
                    text: "Download",
                    variant: "primary",
                    disabled: !theme.content || theme.id === "preview",
                    onClick: async () => {
                        const fileName = `${theme?.name}.theme.css`;

                        const exists = await Native.themeExists(theme);
                        if (exists) {
                            openModal(modalProps => (
                                <Modal
                                    {...modalProps}
                                    size="sm"
                                    title="Conflict!"
                                    actions={[
                                        {
                                            text: "Overwrite",
                                            variant: "dangerPrimary",
                                            onClick: async () => {
                                                await downloadTheme(theme);
                                                modalProps.onClose();
                                            }
                                        },
                                        {
                                            text: "Keep my file",
                                            variant: "positive",
                                            onClick: () => modalProps.onClose()
                                        }
                                    ]}
                                >
                                    <Paragraph style={{ padding: "8px" }}>
                                        <div style={{ display: "flex", flexDirection: "column" }}>
                                            <p>A theme with the same name <b>already exists</b> in your themes directory! Do you want to overwrite it?</p>
                                            <div className="vce-overwrite-modal">
                                                <code style={{ wordWrap: "break-word" }}>
                                                    {fileName}
                                                </code>
                                            </div>
                                        </div>
                                    </Paragraph>
                                </Modal>
                            ));
                        } else {
                            await downloadTheme(theme);
                        }
                    }
                }
            ]}
        >
            <Heading style={{ marginTop: "10px" }}>{authors.length > 1 ? "Authors" : "Author"}</Heading>
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
                        <Paragraph style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {authors.map(author => author.username).join(", ")}
                        </Paragraph>
                    </div>
                    {version && (
                        <>
                            <Heading style={{ marginTop: "10px" }}>Version</Heading>
                            <Paragraph>
                                {version}
                            </Paragraph>
                        </>
                    )}
                    <Heading style={{ marginTop: "10px" }}>Likes</Heading>
                    <Paragraph>
                        {likes === 0 ? `Nobody liked this ${type} yet.` : `${likes} users liked this ${type}!`}
                    </Paragraph>
                    {donate && (
                        <>
                            <Heading style={{ marginTop: "10px" }}>Donate</Heading>
                            <Paragraph>
                                You can support the author by donating below!
                            </Paragraph>
                            <Paragraph style={{ marginTop: "10px" }}>
                                <Button onClick={() => VencordNative.native.openExternal(donate)}>
                                    <Heart />
                                    Donate
                                </Button>
                            </Paragraph>
                        </>
                    )}
                    {(guild || invite) && (
                        <>
                            <Heading style={{ marginTop: "10px" }}>Support Server</Heading>
                            {guild && (
                                <Paragraph>
                                    {guild.name}
                                </Paragraph>
                            )}
                            <Paragraph>
                                <Button
                                    color={Button.Colors.BRAND}
                                    look={Button.Looks.FILLED}
                                    className={Margins.top8}
                                    onClick={async e => {
                                        e.preventDefault();
                                        const useInvite = guild ? guild.invite_link?.split("discord.gg/")[1] : invite;
                                        useInvite != null && openInviteModal(useInvite).catch(() => showToast({ text: "Invalid or expired invite!", variant: "critical" }));
                                    }}
                                >
                                    Join Discord Server
                                </Button>
                            </Paragraph>
                        </>
                    )}
                    <Heading style={{ marginTop: "10px" }}>Source</Heading>
                    <Paragraph>
                        <Button
                            disabled={!theme.content || theme.id === "preview"}
                            onClick={() => openModal(modalProps => (
                                <Modal
                                    {...modalProps}
                                    size="lg"
                                    title="Theme Source"
                                    actions={[
                                        {
                                            text: "Close",
                                            variant: "dangerPrimary",
                                            onClick: () => modalProps.onClose()
                                        },
                                        {
                                            text: "Copy to Clipboard",
                                            variant: "primary",
                                            onClick: () => {
                                                copyToClipboard(themeContent);
                                                showToast({ text: "Copied to Clipboard", variant: "success" });
                                            }
                                        }
                                    ]}
                                >
                                    <Paragraph style={{ padding: "8px" }}>
                                        <CodeBlock lang="css" content={themeContent} />
                                    </Paragraph>
                                </Modal>
                            ))}
                        >
                            View Theme Source
                        </Button>
                    </Paragraph>
                    {tags && (
                        <>
                            <Heading style={{ marginTop: "10px" }}>Tags</Heading>
                            <Paragraph>
                                {tags.map(tag => (
                                    <span className="vce-theme-info-tag" key={"vce-theme-info-tag"}>
                                        {tag}
                                    </span>
                                ))}
                            </Paragraph>
                        </>
                    )}
                    {requiresThemeAttributes && (
                        <Paragraph style={{ marginTop: "10px" }}>
                            <WarningIcon /> This theme requires the <b>ThemeAttributes</b> plugin!
                        </Paragraph>
                    )}
                    {last_updated && (
                        <Paragraph style={{ marginTop: "10px" }}>
                            <ClockIcon /> This theme was last updated {Parser.parse("<t:" + lastUpdated + ":F>")} ({Parser.parse("<t:" + lastUpdated + ":R>")})
                        </Paragraph>
                    )}
                </div>
            </div>
        </Modal>
    );
};
