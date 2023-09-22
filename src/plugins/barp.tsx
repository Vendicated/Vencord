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

import { showNotification } from "@api/Notifications";
import { Settings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import { getTheme, insertTextIntoChatInputBox, Theme } from "@utils/discord";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { OptionType, PluginOptionsItem } from "@utils/types";
import { Button, ButtonLooks, ButtonWrapperClasses, Forms, Tooltip, useState } from "@webpack/common";

const cl = classNameFactory("vc-st-");

async function sendToBurn(body, oneUse = true, expiration = 0, settings: any = Settings.plugins.BARP) {
    const requestData = {
        body,
        oneUse,
        expiration,
    };

    try {
        const response = await fetch(settings.proxyUrl as string, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestData),
        });

        if (response.ok) {
            const data = await response.json();
            if (data.id) {
                insertTextIntoChatInputBox(`${data.url}`);
            } else {
                console.error("Error creating paste:", data.error);
                showNotification({
                    title: "Error creating paste",
                    body: data.error,
                    color: "var(--red-360)",
                });
            }
        } else {
            console.error("Proxy request failed with status:", response.status);
            showNotification({
                title: "Error creating paste",
                body: `Proxy request failed with status: ${response.status}`,
                color: "var(--red-360)",
            });
        }
    } catch (error) {
        console.error("Proxy request failed:", error);
        showNotification({
            title: "Error creating paste",
            body: `Error creating paste: ${error}`,
            color: "var(--red-360)",
        });
    }
}

function MessageModal({ rootProps, close }: { rootProps: ModalProps, close(): void; }) {
    const [message, setMessage] = useState<string>();

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h2">
                    Input your Message here
                </Forms.FormTitle>

                <ModalCloseButton onClick={close} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                <input
                    type="text"
                    value={message}
                    onChange={e => setMessage(e.currentTarget.value)}
                    style={{
                        colorScheme: getTheme() === Theme.Light ? "light" : "dark",
                    }}
                />
            </ModalContent>

            <ModalFooter>
                <Button
                    onClick={() => {
                        sendToBurn(message!);
                        close();
                    }}
                >Send</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export default definePlugin({
    name: "BARP",
    description: "This is Plugin that Burns the Message after it is Read. By Default you can use my Public Instance but in Settings you can also set your own Instance.",
    authors: [Devs.Wuemeli],
    dependencies: ["MessageEventsAPI"],

    patches: [
        {
            find: ".activeCommandOption",
            replacement: {
                match: /(.)\.push.{1,30}disabled:(\i),.{1,20}\},"gift"\)\)/,
                replace: "$&;try{$2||$1.push($self.chatBarIcon())}catch{}",
            }
        },
    ],

    optionsCache: null as Record<string, PluginOptionsItem> | null,

    get options() {
        return this.optionsCache ??= {
            proxyUrl: {
                type: OptionType.STRING,
                description: "Proxy URL: You need to include the full URL with '/proxy.' If you wish to use your own instance, the code is available here: https://github.com/Wuemeli/BARP-Proxy.",
                default: "https://pasteproxy.wuemeli.com/proxy"
            },
        };
    },

    start() {
    },
    stop() {
    },

    chatBarIcon() {
        return (
            <Tooltip text="Make a Burnable Message">
                {({ onMouseEnter, onMouseLeave }) => (
                    <div style={{ display: "flex" }}>
                        <Button
                            aria-haspopup="dialog"
                            aria-label="Create a Burnable Message"
                            size=""
                            look={ButtonLooks.BLANK}
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            innerClassName={ButtonWrapperClasses.button}
                            onClick={() => {
                                const key = openModal(props => (
                                    <MessageModal
                                        rootProps={props}
                                        close={() => closeModal(key)}
                                    />
                                ));
                            }}
                            className={cl("button")}
                        >
                            <div className={ButtonWrapperClasses.buttonWrapper}>
                                <svg
                                    aria-hidden="true"
                                    role="img"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                >
                                    <g fill="none" fill-rule="evenodd">
                                        <path fill="currentColor" d="M8 16c3.314 0 6-2 6-5.5 0-1.5-.5-4-2.5-6 .25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6-1.25 1-2 2.729-2 4.5C2 14 4.686 16 8 16Zm0-1c-1.657 0-3-1-3-2.75 0-.75.25-2 1.25-3C6.125 10 7 10.5 7 10.5c-.375-1.25.5-3.25 2-3.5-.179 1-.25 2 1 3 .625.5 1 1.364 1 2.25C11 14 9.657 15 8 15Z"></path>
                                        <rect width="24" height="24" />
                                    </g>
                                </svg>
                            </div>
                        </Button>
                    </div>
                )}
            </Tooltip>
        );
    }
});
