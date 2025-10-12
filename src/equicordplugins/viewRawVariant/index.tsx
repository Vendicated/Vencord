/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { BaseText } from "@components/BaseText";
import { CodeBlock } from "@components/CodeBlock";
import { Divider } from "@components/Divider";
import ErrorBoundary from "@components/ErrorBoundary";
import { Heading } from "@components/Heading";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import { Margins } from "@utils/margins";
import {
    closeModal,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalRoot,
    ModalSize,
    openModal,
} from "@utils/modal";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { Menu } from "@webpack/common";

type CustomMessage = Message & {
    editHistory?: any;
    deleted?: any;
    firstEditTimestamp?: any;
};

const CopyIcon = () => {
    return (
        <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            width="18"
            height="18"
        >
            <path d="M12.9297 3.25007C12.7343 3.05261 12.4154 3.05226 12.2196 3.24928L11.5746 3.89824C11.3811 4.09297 11.3808 4.40733 11.5739 4.60245L16.5685 9.64824C16.7614 9.84309 16.7614 10.1569 16.5685 10.3517L11.5739 15.3975C11.3808 15.5927 11.3811 15.907 11.5746 16.1017L12.2196 16.7507C12.4154 16.9477 12.7343 16.9474 12.9297 16.7499L19.2604 10.3517C19.4532 10.1568 19.4532 9.84314 19.2604 9.64832L12.9297 3.25007Z" />
            <path d="M8.42616 4.60245C8.6193 4.40733 8.61898 4.09297 8.42545 3.89824L7.78047 3.24928C7.58466 3.05226 7.26578 3.05261 7.07041 3.25007L0.739669 9.64832C0.5469 9.84314 0.546901 10.1568 0.739669 10.3517L7.07041 16.7499C7.26578 16.9474 7.58465 16.9477 7.78047 16.7507L8.42545 16.1017C8.61898 15.907 8.6193 15.5927 8.42616 15.3975L3.43155 10.3517C3.23869 10.1569 3.23869 9.84309 3.43155 9.64824L8.42616 4.60245Z" />
        </svg>
    );
};

function cleanMessage(msg: CustomMessage) {
    const author = { ...msg.author } as any;
    delete author.email;
    delete author.phone;
    delete author.mfaEnabled;
    delete author.personalConnectionId;
    delete msg.editHistory;
    delete msg.deleted;
    delete msg.firstEditTimestamp;
    return { ...msg, author };
}

function openViewRawModal(obj: any, type: string, isMessage?: boolean) {
    const key = openModal(props => (
        <ErrorBoundary>
            <ModalRoot {...props} size={ModalSize.LARGE}>
                <ModalHeader>
                    <BaseText size="lg" weight="semibold" style={{ flexGrow: 1 }}>
                        View Raw {type}
                    </BaseText>
                    <ModalCloseButton onClick={() => closeModal(key)} />
                </ModalHeader>
                <ModalContent>
                    <div style={{ padding: "16px 0" }}>
                        {isMessage && (
                            <>
                                <Heading>
                                    Content
                                </Heading>
                                <CodeBlock
                                    content={obj.content}
                                    lang="markdown"
                                />
                                <Divider className={Margins.bottom20} />
                            </>
                        )}

                        <Heading>{type} Data</Heading>
                        <CodeBlock
                            content={JSON.stringify(obj, null, 4)}
                            lang="json"
                        />
                    </div>
                </ModalContent>
            </ModalRoot>
        </ErrorBoundary>
    ));
}

function makeContextCallback(
    name: string,
    action: (any) => void,
): NavContextMenuPatchCallback {
    return (children, props) => {
        if (props.label === getIntlMessage("CHANNEL_ACTIONS_MENU_LABEL"))
            return; // random shit like notification settings

        const value = props[name];
        if (!value) return;

        const lastChild = children.at(-1);
        if (lastChild?.key === "developer-actions") {
            const p = lastChild.props;
            if (!Array.isArray(p.children)) p.children = [p.children];

            children = p.children;
        }

        children.push(
            <Menu.MenuItem
                id={`c98-view-${name}-raw`}
                label="View Raw"
                action={() => action(value)}
                icon={CopyIcon}
            />,
        );
    };
}

export default definePlugin({
    name: "ViewRawVariant",
    description: "Copy/View raw content of any message, channel, or guild, but show in the right click menu.",
    authors: [Devs.KingFish, Devs.Ven, Devs.rad, Devs.ImLvna, Devs.Kyuuhachi],
    contextMenus: {
        "guild-context": makeContextCallback("guild", val =>
            openViewRawModal(val, "Guild"),
        ),
        "channel-context": makeContextCallback("channel", val =>
            openViewRawModal(val, "Channel"),
        ),
        "user-context": makeContextCallback("user", val =>
            openViewRawModal(val, "User"),
        ),
        message: makeContextCallback("message", val =>
            openViewRawModal(cleanMessage(val), "Message", true),
        ),
    },
});
