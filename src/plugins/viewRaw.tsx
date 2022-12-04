/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { addButton, removeButton } from "@api/MessagePopover";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/misc";
import { closeModal, ModalCloseButton, ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, ChannelStore, Forms, Margins, Parser } from "@webpack/common";
import { Message } from "discord-types/general";


const CopyIcon = () => {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24">
            <path
                fill="#347dfa"
                d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
            />
        </svg>
    );
};

function sortObject<T extends object>(obj: T): T {
    return Object.fromEntries(Object.entries(obj).sort(([k1], [k2]) => k1.localeCompare(k2))) as T;
}

function cleanMessage(msg: Message) {
    const clone = sortObject(JSON.parse(JSON.stringify(msg)));
    for (const key in clone.author) {
        switch (key) {
            case "id":
            case "username":
            case "usernameNormalized":
            case "discriminator":
            case "avatar":
            case "bot":
            case "system":
            case "publicFlags":
                break;
            default:
                // phone number, email, etc
                delete clone.author[key];
        }
    }

    // message logger added properties
    const cloneAny = clone as any;
    delete cloneAny.editHistory;
    delete cloneAny.deleted;
    cloneAny.attachments?.forEach(a => delete a.deleted);

    return clone;
}

function CodeBlock(props: { content: string, lang: string; }) {
    return (
        // make text selectable
        <div style={{ userSelect: "text" }}>
            {Parser.defaultRules.codeBlock.react(props, null, {})}
        </div>
    );
}

function openViewRawModal(msg: Message) {
    msg = cleanMessage(msg);
    const msgJson = JSON.stringify(msg, null, 4);

    const key = openModal(props => (
        <ErrorBoundary>
            <ModalRoot {...props} size={ModalSize.LARGE}>
                <ModalHeader>
                    <Forms.FormTitle tag="h1">View Raw</Forms.FormTitle>
                    <ModalCloseButton onClick={() => closeModal(key)} />
                </ModalHeader>
                <ModalContent style={{ padding: "1em" }}>
                    <Flex style={{ marginBottom: "1em", marginTop: "1em" }}>
                        <Button onClick={() => copyWithToast(msg.content, "Content copied to clipboard!")}>
                            Copy Raw Content
                        </Button>
                        <Button onClick={() => copyWithToast(msgJson, "Message data copied to clipboard!")}>
                            Copy Message JSON
                        </Button>
                    </Flex>

                    {!!msg.content && (
                        <>
                            <Forms.FormTitle tag="h5">Content</Forms.FormTitle>
                            <CodeBlock content={msg.content} lang="" />
                            <Forms.FormDivider classes={Margins.marginBottom20} />
                        </>
                    )}

                    <Forms.FormTitle tag="h5">Message Data</Forms.FormTitle>
                    <CodeBlock content={msgJson} lang="json" />
                </ModalContent >
            </ModalRoot >
        </ErrorBoundary >
    ));
}

export default definePlugin({
    name: "ViewRaw",
    description: "Copy and view the raw content/data of any message.",
    authors: [Devs.KingFish, Devs.Ven],
    dependencies: ["MessagePopoverAPI"],

    start() {
        addButton("ViewRaw", msg => {
            return {
                label: "Copy Raw (Left Click) / View Raw (Right Click)",
                icon: CopyIcon,
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: () => copyWithToast(msg.content),
                onContextMenu: e => {
                    e.preventDefault();
                    e.stopPropagation();
                    openViewRawModal(msg);
                }
            };
        });
    },

    stop() {
        removeButton("CopyRawMessage");
    }
});
