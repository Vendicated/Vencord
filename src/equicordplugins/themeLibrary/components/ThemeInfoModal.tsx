/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CodeBlock } from "@components/CodeBlock";
import { Heart } from "@components/Heart";
import { openInviteModal } from "@utils/discord";
import { Margins } from "@utils/margins";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import { findComponentByCodeLazy } from "@webpack";
import { Button, Clipboard, Forms, React, showToast, Toasts } from "@webpack/common";

import { ThemeInfoModalProps } from "../types";

const UserSummaryItem = findComponentByCodeLazy("defaultRenderUser", "showDefaultAvatarsForNullUsers");

export const ThemeInfoModal: React.FC<ThemeInfoModalProps> = ({ author, theme, ...props }) => {

    const content = atob(theme.content);
    const metadata = content.match(/\/\*\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\//g)?.[0] || "";
    const donate = metadata.match(/@donate\s+(.+)/)?.[1] || "";
    const version = metadata.match(/@version\s+(.+)/)?.[1] || "";

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">Theme Details</Forms.FormTitle>
            </ModalHeader>

            <ModalContent>
                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Author</Forms.FormTitle>
                <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center" }}>
                            <UserSummaryItem
                                users={[author]}
                                guildId={undefined}
                                renderIcon={false}
                                showDefaultAvatarsForNullUsers
                                size={32}
                                showUserPopout
                                className={Margins.right8}
                            />

                            <Forms.FormText>
                                {author.username}
                            </Forms.FormText>
                        </div>
                        <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Source</Forms.FormTitle>
                        <Forms.FormText>
                            <Button onClick={() => openModal(modalProps => (
                                <ModalRoot {...modalProps}>
                                    <ModalHeader>
                                        <Forms.FormTitle tag="h4">Theme Source</Forms.FormTitle>
                                    </ModalHeader>
                                    <ModalContent>
                                        <Forms.FormText style={{
                                            padding: "5px",
                                        }}>
                                            <CodeBlock lang="css" content={content} />
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
                                                Clipboard.copy(content);
                                                showToast("Copied to Clipboard", Toasts.Type.SUCCESS);
                                            }}>Copy to Clipboard</Button>
                                    </ModalFooter>
                                </ModalRoot>
                            ))}
                            >
                                View Theme Source
                            </Button>
                        </Forms.FormText>
                        {version && (
                            <>
                                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Version</Forms.FormTitle>
                                <Forms.FormText>
                                    {version}
                                </Forms.FormText>
                            </>
                        )}
                        {donate && (
                            <>
                                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Donate</Forms.FormTitle>
                                <Forms.FormText>
                                    You can support the author by donating below.
                                </Forms.FormText>
                                <Forms.FormText style={{ marginTop: "10px" }}>
                                    <Button onClick={() => VencordNative.native.openExternal(donate)}>
                                        <Heart />
                                        Donate
                                    </Button>
                                </Forms.FormText>
                            </>
                        )}
                        {theme.guild && (
                            <>
                                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Support Server</Forms.FormTitle>
                                <Forms.FormText>
                                    {theme.guild.name}
                                </Forms.FormText>
                                <Forms.FormText>
                                    <Button
                                        color={Button.Colors.BRAND_NEW}
                                        look={Button.Looks.FILLED}
                                        className={Margins.top8}
                                        onClick={async e => {
                                            e.preventDefault();
                                            theme.guild?.invite_link != null && openInviteModal(theme.guild?.invite_link.split("discord.gg/")[1]).catch(() => showToast("Invalid or expired invite!", Toasts.Type.FAILURE));
                                        }}
                                    >
                                        Join Discord Server
                                    </Button>
                                </Forms.FormText>
                            </>
                        )}
                        {theme.tags && (
                            <>
                                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Tags</Forms.FormTitle>
                                <Forms.FormText>
                                    {theme.tags.map(tag => (
                                        <span className="vce-theme-info-tag">
                                            {tag}
                                        </span>
                                    ))}
                                </Forms.FormText>
                            </>
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
            </ModalFooter>
        </ModalRoot>
    );
};
