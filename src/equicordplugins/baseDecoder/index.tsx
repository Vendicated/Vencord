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

import { addMessagePopoverButton, removeMessagePopoverButton } from "@api/MessagePopover";
import { definePluginSettings } from "@api/Settings";
import { CodeBlock } from "@components/CodeBlock";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { EquicordDevs } from "@utils/constants";
import { copyWithToast } from "@utils/misc";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ChannelStore, Forms, Text } from "@webpack/common";

const DecodeIcon = () => {
    return (
        <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.5 9.50026H14.0385C15.4063 9.50026 16.0902 9.50026 16.5859 9.82073C16.8235 9.97438 17.0259 10.1767 17.1795 10.4144C17.5 10.91 17.5 11.5939 17.5 12.9618C17.5 14.3297 17.5 15.0136 17.1795 15.5092C17.0259 15.7469 16.8235 15.9492 16.5859 16.1029C16.0902 16.4233 15.4063 16.4233 14.0385 16.4233H9.5M6.5 9.50026L8.75 7.42334M6.5 9.50026L8.75 11.5772" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
};


function isValidUtf8String(str) {
    try {
        new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(str.split("").map(char => char.charCodeAt(0))));
        return true;
    } catch (e) {
        return false;
    }
}

function findBase64Strings(content) {
    const base64Regex = /\b[A-Za-z0-9+/]{4,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?\b/g;
    const matches = content.match(base64Regex);
    return matches || [];
}

function decodeBase64Strings(base64Strings) {
    return base64Strings.map(base64 => {
        try {
            const decoded = atob(base64);
            return isValidUtf8String(decoded) ? decoded : null;
        } catch (e) {
            console.error("Failed to decode base64 content:", e);
            return null;
        }
    }).filter(decoded => decoded !== null);
}


function openDecodedBase64Modal(decodedContent) {
    const key = openModal(props => (
        <ErrorBoundary>
            <ModalRoot {...props} size={ModalSize.LARGE}>
                <ModalHeader>
                    <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Decoded Base64 Content</Text>
                    <ModalCloseButton onClick={() => closeModal(key)} />
                </ModalHeader>
                <ModalContent>
                    <div style={{ padding: "16px 0" }}>
                        <Forms.FormTitle tag="h5">Decoded Content</Forms.FormTitle>
                        {decodedContent.map((content, index) => (
                            <CodeBlock key={index} content={content} lang="" />
                        ))}
                    </div>
                </ModalContent >
                <ModalFooter>
                    <Flex cellSpacing={10}>
                        {decodedContent.map((content, index) => (
                            <Button key={index} onClick={() => copyWithToast(content, "Decoded content copied to clipboard!")}>
                                Copy Decoded Content {index + 1}
                            </Button>
                        ))}
                    </Flex>
                </ModalFooter>
            </ModalRoot >
        </ErrorBoundary >
    ));
}

const settings = definePluginSettings({
    clickMethod: {
        description: "Change the button to decode base64 content of any message.",
        type: OptionType.SELECT,
        options: [
            { label: "Left Click to decode the base64 content.", value: "Left", default: true },
            { label: "Right click to decode the base64 content.", value: "Right" }
        ]
    }
});

export default definePlugin({
    name: "DecodeBase64",
    description: "Decode base64 content of any message and copy the decoded content.",
    authors: [EquicordDevs.ThePirateStoner],
    dependencies: ["MessagePopoverAPI"],
    settings,
    contextMenus: {
    },

    start() {
        addMessagePopoverButton("DecodeBase64", msg => {
            const handleClick = () => {
                const base64Strings = findBase64Strings(msg.content);
                const decodedContent = decodeBase64Strings(base64Strings);
                if (settings.store.clickMethod === "Right") {
                    decodedContent.forEach(content => copyWithToast(content));
                } else {
                    openDecodedBase64Modal(decodedContent);
                }
            };

            const handleContextMenu = e => {
                const base64Strings = findBase64Strings(msg.content);
                const decodedContent = decodeBase64Strings(base64Strings);
                if (settings.store.clickMethod === "Left") {
                    e.preventDefault();
                    e.stopPropagation();
                    decodedContent.forEach(content => copyWithToast(content));
                } else {
                    e.preventDefault();
                    e.stopPropagation();
                    openDecodedBase64Modal(decodedContent);
                }
            };

            const label = settings.store.clickMethod === "Right"
                ? "Copy Decoded (Left Click) / Decode Base64 (Right Click)"
                : "Decode Base64 (Left Click) / Copy Decoded (Right Click)";

            return {
                label,
                icon: DecodeIcon,
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: handleClick,
                onContextMenu: handleContextMenu
            };
        });
    },

    stop() {
        removeMessagePopoverButton("DecodeBase64");
    }
});
