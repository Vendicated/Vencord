/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
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
import { Button, ChannelStore, Forms, i18n, Menu, Text } from "@webpack/common";
import { Message } from "discord-types/general";
import { CopyIcon } from "@components/Icons";

export default definePlugin({
    name: "Plural Kit Edit",
    description: "Allows easier editing of pluralkit messages",
    authors: [{ id: 553652308295155723n, name: "Scyye" }],
    start() {
        addButton("EditPluralkit", msg => {
            const handleClick = () => {
                const pk = msg.author.bot && msg.author.discriminator === "0000";
                const pkData = pk ? msg.content : "";
                if (pk) {
                    openViewRawModal(pkData, "PluralKit", msg.content);
                }
            };

            const handleContextMenu = e => {
                e.preventDefault();
                e.stopPropagation();
            };

            const label = "Edit PluralKit"

            return {
                label,
                icon: (props, context) => {
                    return <svg viewBox={
                        "0 0 20 20"
                    } fill="currentColor" aria-hidden="true" width="18" height="18" {...props}></svg>
                },
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: handleClick,
                onContextMenu: handleContextMenu
            };
        });
    },
    stop() {
        removeButton("EditPluralkit");
    },
});

function openViewRawModal(json: string, type: string, msgContent?: string) {
    const key = openModal(props => (
        <ErrorBoundary>
            <ModalRoot {...props} size={ModalSize.LARGE}>
    <ModalHeader>
        <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>View Raw</Text>
    <ModalCloseButton onClick={() => closeModal(key)} />
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
    </div>
    </ModalContent >
    <ModalFooter>
    <Flex cellSpacing={10}>
    <Button onClick={() => copyWithToast(json, `${type} data copied to clipboard!`)}>
    Copy {type} JSON
    </Button>
    </Flex>
    </ModalFooter>
    </ModalRoot >
    </ErrorBoundary >
));
}
