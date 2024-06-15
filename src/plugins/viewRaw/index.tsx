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

import type { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { addButton, removeButton } from "@api/MessagePopover";
import { definePluginSettings } from "@api/Settings";
import { CodeBlock } from "@components/CodeBlock";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { copyWithToast } from "@utils/misc";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import type { MessageRecord } from "@vencord/discord-types";
import { Button, ChannelStore, Forms, i18n, Menu, Text } from "@webpack/common";
import type { MouseEvent } from "react";

const CopyIcon = () => (
    <svg
        width="18"
        height="18"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
    >
        <path d="M12.9297 3.25007c-.1954-.19746-.5143-.19781-.7101-.00079l-.645.64896c-.1935.19473-.1938.50909-.0007.70421l4.9946 5.04579c.1929.19485.1929.50866 0 .70346l-4.9946 5.0458c-.1931.1952-.1928.5095.0007.7042l.645.649c.1958.197.5147.1967.7101-.0008l6.3307-6.3982c.1928-.1949.1928-.50856 0-.70338l-6.3307-6.39825ZM8.42616 4.60245c.19314-.19512.19282-.50948-.00071-.70421l-.64498-.64896c-.19581-.19702-.51469-.19667-.71006.00079L.739669 9.64832c-.192769.19482-.192768.50848 0 .70338l6.330741 6.3982c.19537.1975.51424.1978.71006.0008l.64498-.649c.19353-.1947.19385-.509.00071-.7042l-4.99461-5.0458c-.19286-.1948-.19286-.50861 0-.70346l4.99461-5.04579Z" />
    </svg>
);

const sortObject = <T extends object>(obj: T): T =>
    Object.fromEntries(Object.entries(obj).sort(([k1], [k2]) => k1.localeCompare(k2))) as T;

function cleanMessage(message: MessageRecord) {
    const clone = sortObject(JSON.parse(JSON.stringify(message)));
    for (const key of [
        "email",
        "phone",
        "mfaEnabled",
        "personalConnectionId"
    ]) delete clone.author[key];

    // message logger added properties
    delete clone.editHistory;
    delete clone.deleted;
    clone.attachments?.forEach((a: any) => { delete a.deleted; });

    return clone;
}

function openViewRawModal(json: string, type: string, msgContent?: string) {
    const key = openModal(props => (
        <ErrorBoundary>
            <ModalRoot {...props} size={ModalSize.LARGE}>
                <ModalHeader>
                    <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>View Raw</Text>
                    <ModalCloseButton onClick={() => { closeModal(key); }} />
                </ModalHeader>
                <ModalContent>
                    <div style={{ padding: "16px 0" }}>
                        {!!msgContent && (
                            <>
                                <Forms.FormTitle tag="h5">Content</Forms.FormTitle>
                                <CodeBlock content={msgContent} lang="" />
                                <Forms.FormDivider className={Margins.bottom20} />
                            </>
                        )}

                        <Forms.FormTitle tag="h5">{type} Data</Forms.FormTitle>
                        <CodeBlock content={json} lang="json" />
                    </div>
                </ModalContent >
                <ModalFooter>
                    <Flex cellSpacing={10}>
                        <Button onClick={() => { copyWithToast(json, `${type} data copied to clipboard!`); }}>
                            Copy {type} JSON
                        </Button>
                        {!!msgContent && (
                            <Button onClick={() => { copyWithToast(msgContent, "Content copied to clipboard!"); }}>
                                Copy Raw Content
                            </Button>
                        )}
                    </Flex>
                </ModalFooter>
            </ModalRoot >
        </ErrorBoundary >
    ));
}

function openViewRawModalMessage(message: MessageRecord) {
    message = cleanMessage(message);
    const messageJSON = JSON.stringify(message, null, 4);

    openViewRawModal(messageJSON, "Message", message.content);
}

const settings = definePluginSettings({
    clickMethod: {
        description: "Change the button to view the raw content/data of any message.",
        type: OptionType.SELECT,
        options: [
            { label: "Left Click to view the raw content.", value: "Left", default: true },
            { label: "Right click to view the raw content.", value: "Right" }
        ]
    }
});

function MakeContextCallback(name: "Guild" | "User" | "Channel"): NavContextMenuPatchCallback {
    return (children, props) => {
        const value = props[name.toLowerCase()];
        if (!value) return;
        if (props.label === i18n.Messages.CHANNEL_ACTIONS_MENU_LABEL) return; // random shit like notification settings

        const lastChild = children.at(-1);
        if (lastChild?.key === "developer-actions") {
            const p = lastChild.props;
            if (!Array.isArray(p.children))
                p.children = [p.children];

            children = p.children;
        }

        children.splice(-1, 0,
            <Menu.MenuItem
                id={`vc-view-${name.toLowerCase()}-raw`}
                label="View Raw"
                action={() => { openViewRawModal(JSON.stringify(value, null, 4), name); }}
                icon={CopyIcon}
            />
        );
    };
}

export default definePlugin({
    name: "ViewRaw",
    description: "Copy and view the raw content/data of any message, channel or guild",
    authors: [Devs.KingFish, Devs.Ven, Devs.rad, Devs.ImLvna],
    dependencies: ["MessagePopoverAPI"],
    settings,
    contextMenus: {
        "guild-context": MakeContextCallback("Guild"),
        "channel-context": MakeContextCallback("Channel"),
        "user-context": MakeContextCallback("User")
    },

    start() {
        addButton("ViewRaw", message => {
            function handleClick() {
                if (settings.store.clickMethod === "Right") {
                    copyWithToast(message.content);
                } else {
                    openViewRawModalMessage(message);
                }
            }

            function handleContextMenu(event: MouseEvent<HTMLButtonElement>) {
                if (settings.store.clickMethod === "Left") {
                    event.preventDefault();
                    event.stopPropagation();
                    copyWithToast(message.content);
                } else {
                    event.preventDefault();
                    event.stopPropagation();
                    openViewRawModalMessage(message);
                }
            }

            const label = settings.store.clickMethod === "Right"
                ? "Copy Raw (Left Click) / View Raw (Right Click)"
                : "View Raw (Left Click) / Copy Raw (Right Click)";

            return {
                label,
                icon: CopyIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id)!,
                onClick: handleClick,
                onContextMenu: handleContextMenu
            };
        });
    },

    stop() {
        removeButton("ViewRaw");
    }
});
