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

import { Message } from "discord-types/general";

import { addElement, removeElement,RenderPosition } from "../api/ServerList";
import { Devs } from "../utils/constants";
import { openPrivateChannel } from "../utils/discord";
import definePlugin, { OptionType } from "../utils/types";
import { Settings } from "../Vencord";
import { ChannelStore, ContextMenu, FluxDispatcher, Forms, Menu, React, UserStore } from "../webpack/common";

interface ITyping {
    channelId: string;
    userId: string;
}

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}

namespace Indicator {
    const typingUsers: Array<ITyping> = [];
    let toolTipString: string = "";

    const dotsIcon = () => (
        <svg
            className="circleIcon"
            height="24"
            width="24"
            viewBox="0 0 24 24"
            fill="currentColor"
        >
            <path
                d="M12,1.5A1.5,1.5,0,1,1,13.5,3,1.5,1.5,0,0,1,12,1.5Zm-6,0A1.5,1.5,0,1,1,7.5,3,1.5,1.5,0,0,1,6,1.5Zm-6,0A1.5,1.5,0,1,1,1.5,3,1.5,1.5,0,0,1,0,1.5Z"
                transform="translate(4.5 11)"
            />
        </svg>
    );

    let buttonType: any;
    let buttonProps: any;
    let buttonChildren: any;

    function ContextMenuElement() {

        const buttons: Array<JSX.Element> = [];

        for (let i = 0; i < typingUsers.length; i++) {
            const user = UserStore.getUser(typingUsers[i].userId);
            if (user) {
                buttons.push(
                    <Menu.MenuItem
                        id={`typing-${i}`}
                        label={user.username}
                        action={() => {
                            openPrivateChannel(user.id);
                        }}
                    />
                );
            }
        }

        return React.createElement(
            Menu.ContextMenu,
            {
                navId: "typing-indicator-menu",
                onClose: () => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })
            },
            buttons
        );
    }

    export const Init = (type: any, props: any, ...childern: any) => {
        if (!buttonType && type) {
            buttonType = type;
        }

        if (!buttonProps && props) {
            buttonProps = props;

            buttonProps.id = "dm-typing-indicator";

            buttonProps.onClick = () => {
                if (typingUsers.length > 0) {
                    openPrivateChannel(typingUsers[0].userId);
                }
            };

            buttonProps.onContextMenu = (e: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
                ContextMenu.open(e, () => ContextMenuElement());
            };

            buttonProps.icon = dotsIcon;

            buttonProps.showPill = true;

            toolTipString = Settings.plugins?.TypingIndicator?.alwaysShow ? Settings.plugins?.TypingIndicator?.emptyMessage : "";
        }

        if (!buttonChildren && childern) {
            buttonChildren = childern;
        }
    };

    let forceRenderIndicator: React.DispatchWithoutAction;

    export const addUser = (channelId: string, userId: string) => {
        const user = typingUsers.find(o => o.channelId === channelId && o.userId === userId);

        if (!user) {
            typingUsers.push({ channelId, userId });
            UpdateElement();
        }
    };

    export const removeUser = (channelId: string, userId: string) => {
        const userIndex = typingUsers.findIndex(o => {
            return o.channelId === channelId && o.userId === userId;
        });

        if (userIndex !== -1) {
            typingUsers.splice(userIndex, 1);
            UpdateElement();
        }
    };

    export const UpdateElement = () => {

        if (!buttonProps || !forceRenderIndicator)
            return;

        if (typingUsers.length === 0) {
            toolTipString = Settings.plugins?.TypingIndicator?.alwaysShow ? Settings.plugins?.TypingIndicator?.emptyMessage : "";
            forceRenderIndicator();
            return;
        }

        if (typingUsers.length === 1) {
            const user = UserStore.getUser(typingUsers[0].userId);
            toolTipString = `${user.username} is typing...`;
            forceRenderIndicator();
            return;
        }

        toolTipString = "";
        for (const user of typingUsers) {
            if (user && user.userId) {
                const member = UserStore.getUser(user.userId);
                if (!member) continue;

                toolTipString += `${member.username}, `;
            }
        }
        toolTipString += "are typing...";
        forceRenderIndicator();
    };

    export const Element = () => {

        const [, forceUpdate] = React.useReducer(x => x + 1, 0);

        forceRenderIndicator = forceUpdate;

        if (buttonType && buttonProps && buttonChildren) {

            if (!Settings.plugins?.TypingIndicator?.alwaysShow && toolTipString.length === 0) {
                return null;
            }

            buttonProps.tooltip = toolTipString;

            return React.createElement(buttonType, buttonProps, ...buttonChildren);
        }

        return null;
    };

}

export default definePlugin({
    name: "TypingIndicator",

    authors: [Devs.kemo],

    description: "Typing indicator but for your DMs!",

    dependencies: ["ServerListAPI"],

    patches: [
        {
            find: "id:\"create-join-button\"",
            replacement: {
                match: /(\(.{7}\)\((.{16}id:"create-join-button".*Messages.ADD_A_SERVER,icon:.{4}\})\))/,
                replace: "[$&, Vencord.Plugins.plugins?.TypingIndicator.Init($2)]"
            }
        }
    ],

    renderIndicator: () => {
        return <Indicator.Element />;
    },

    Init(type: any, props: any, ...childern: any) {
        Indicator.Init(type, props, ...childern);
    },

    async onMessage(e: IMessageCreate) {
        if (e.message.author.id === UserStore.getCurrentUser().id) return;
        if (e.optimistic || e.type !== "MESSAGE_CREATE") return;
        if (e.message.state === "SENDING") return;

        Indicator.removeUser(e.channelId, e.message.author.id);
    },

    async onTypingStart(e: ITyping) {

        const channel = ChannelStore.getChannel(e.channelId);

        if (!channel) return;
        if (!channel.isPrivate()) return;

        Indicator.addUser(e.channelId, e.userId);
    },

    async onTypingStop(e: ITyping) {

        const channel = ChannelStore.getChannel(e.channelId);

        if (!channel) return;
        if (!channel.isPrivate()) return;

        Indicator.removeUser(e.channelId, e.userId);
    },

    start() {
        addElement(RenderPosition.Above, this.renderIndicator);

        FluxDispatcher.subscribe("MESSAGE_CREATE", this.onMessage);
        FluxDispatcher.subscribe("TYPING_START", this.onTypingStart);
        FluxDispatcher.subscribe("TYPING_STOP", this.onTypingStop);
    },

    stop() {
        removeElement(RenderPosition.Above, this.renderIndicator);

        FluxDispatcher.unsubscribe("MESSAGE_CREATE", this.onMessage);
        FluxDispatcher.unsubscribe("TYPING_START", this.onTypingStart);
        FluxDispatcher.unsubscribe("TYPING_STOP", this.onTypingStop);
    },

    options: {
        alwaysShow: {
            description: "Always show the indicator",
            type: OptionType.BOOLEAN,
            default: false,
            restartNeeded: true,
        },
        emptyMessage: {
            disabled() {
                return !Settings.plugins?.TypingIndicator?.alwaysShow;
            },
            description: "Text to show when no one is typing",
            type: OptionType.STRING,
            default: "No DMs?",
            restartNeeded: false,
        }
    },

    settingsAboutComponent: () => {
        return (
            <React.Fragment>
                <Forms.FormTitle tag="h3">More Information</Forms.FormTitle>
                <Forms.FormText variant="text-md/normal">
                    Clicking the indicator will open the DMs of the respective user.
                    If multiple users are typing, left clicking will open the DMs of the first user and right clicking will open a context menu with all the users.
                </Forms.FormText>
            </React.Fragment>
        );
    }
});
