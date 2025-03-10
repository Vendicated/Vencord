/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { findByPropsLazy } from "@webpack";
import { Button, Clipboard, Flex, Forms, Parser, Text, useEffect, useState } from "@webpack/common";

import { FriendInvite } from "./types";

const FormStyles = findByPropsLazy("header", "title", "emptyState");
const { createFriendInvite, getAllFriendInvites, revokeFriendInvites } = findByPropsLazy("createFriendInvite");

function CopyButton({ copyText, copiedText, onClick }) {
    const [copied, setCopied] = useState(false);

    const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1000);
        onClick(e);
    };

    return (
        <Button
            onClick={handleButtonClick}
            color={copied ? Button.Colors.GREEN : Button.Colors.BRAND}
            size={Button.Sizes.SMALL}
            look={Button.Looks.FILLED}
        >
            {copied ? copiedText : copyText}
        </Button>
    );
}

function FriendInviteCard({ invite }: { invite: FriendInvite; }) {
    return (
        <div className="vc-friend-codes-card">
            <Flex justify={Flex.Justify.START}>
                <div className="vc-friend-codes-card-title">
                    <Forms.FormTitle tag="h4" style={{ textTransform: "none" }}>
                        {invite.code}
                    </Forms.FormTitle>
                    <span>
                        Expires {Parser.parse(`<t:${new Date(invite.expires_at).getTime() / 1000}:R>`)} • {invite.uses}/{invite.max_uses} uses
                    </span>
                </div>
                <Flex justify={Flex.Justify.END}>
                    <CopyButton
                        copyText="Copy"
                        copiedText="Copied!"
                        onClick={() => Clipboard.copy(`https://discord.gg/${invite.code}`)}
                    />
                </Flex>
            </Flex>
        </div>
    );
}

export default function FriendCodesPanel() {
    const [invites, setInvites] = useState<FriendInvite[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        getAllFriendInvites()
            .then(setInvites)
            .then(() => setLoading(false));
    }, []);

    return (
        <>
            <header className={FormStyles.header}>
                <Forms.FormTitle
                    tag="h2"
                    className={FormStyles.title}
                >
                    Your Friend Codes
                </Forms.FormTitle>

                <Flex
                    style={{ marginBottom: "16px" }}
                    justify={Flex.Justify.BETWEEN}
                >
                    <h2 className="vc-friend-codes-info-header">{`Friend Codes - ${invites.length}`}</h2>
                    <Flex justify={Flex.Justify.END}>
                        <Button
                            color={Button.Colors.GREEN}
                            look={Button.Looks.FILLED}
                            onClick={() => createFriendInvite().then((invite: FriendInvite) => setInvites([...invites, invite]))}
                        >
                            Create Friend Code
                        </Button>
                        <Button
                            style={{ marginLeft: "8px" }}
                            color={Button.Colors.RED}
                            look={Button.Looks.OUTLINED}
                            disabled={!invites.length}
                            onClick={() => revokeFriendInvites().then(setInvites([]))}
                        >
                            Revoke all Friend Codes
                        </Button>
                    </Flex>
                </Flex>
            </header>
            {loading ? (
                <Text
                    variant="heading-md/semibold"
                    className="vc-friend-codes-text"
                >
                    Loading...
                </Text>
            ) : invites.length === 0 ? (
                <Text
                    variant="heading-md/semibold"
                    className="vc-friend-codes-text"
                >
                    You don't have any friend codes yet
                </Text>
            ) : (
                <div style={{ marginTop: "16px", display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "space-evenly" }}>
                    {invites.map(invite => (
                        <FriendInviteCard key={invite.code} invite={invite} />
                    ))}
                </div>
            )}
        </>
    );
}
