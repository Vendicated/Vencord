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

import "./styles.css";

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { addAccessory, removeAccessory } from "@api/MessageAccessories";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { addButton, removeButton } from "@api/MessagePopover";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { sleep } from "@utils/misc";
import definePlugin from "@utils/types";
import { ChannelStore, Menu, SelectedChannelStore } from "@webpack/common";
import { Message } from "discord-types/general";

import { settings } from "./settings";
import { TranslateChatBarIcon, TranslateIcon } from "./TranslateIcon";
import { handleTranslate, TranslationAccessory } from "./TranslationAccessory";
import { shouldTranslate, translate } from "./utils";

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}


const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }) => async () => {
    if (!message.content) return;
    if (!settings.store.autoDecrypt) return;
    if (!message.content) return;
    if (message.channel_id !== SelectedChannelStore.getChannelId()) return;
    if (!shouldTranslate(message.content)) return;
    if (message.state === "SENDING") return;



    const channel = ChannelStore.getChannel(message.channel_id);
    if (!channel) return;

    const trans = await translate("received", message.content, settings.store.version);
    handleTranslate(message.id, trans);

    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;

    group.splice(group.findIndex(c => c?.props?.id === "copy-text") + 1, 0, (
        <Menu.MenuItem
            id="vc-trans"
            label="Decrypt"
            icon={TranslateIcon}
            action={async () => {
                const trans = await translate("received", message.content, settings.store.version);
                handleTranslate(message.id, trans);
            }}
        />
    ));
};

export default definePlugin({
    name: "Decryptar",
    description: "decrypppt",
    authors: [Devs.Drag],
    dependencies: ["MessageAccessoriesAPI", "MessagePopoverAPI", "MessageEventsAPI"],
    settings,
    // not used, just here in case some other plugin wants it or w/e
    translate,

    flux: {
        async MESSAGE_CREATE({ message, channelId }: IMessageCreate) {
            console.log("MESSAGE_CREATE", message, channelId);
            if (!settings.store.autoDecrypt) return;
            if (!message.content) return;
            if (channelId !== SelectedChannelStore.getChannelId()) return;
            if (!await shouldTranslate(message.content)) return;
            if (message.state === "SENDING") return;



            const channel = ChannelStore.getChannel(channelId);
            if (!channel) return;

            const trans = await translate("received", message.content, settings.store.version);
            await sleep(300);
            await handleTranslate(message.id, trans);

        }

    },

    patches: [
        {
            find: "ChannelTextAreaButtons",
            replacement: {
                match: /(\i)\.push.{1,30}disabled:(\i),.{1,20}\},"gift"\)\)/,
                replace: "$&,(()=>{try{$2||$1.push($self.chatBarIcon(arguments[0]))}catch{}})()",
            }
        },
    ],

    start() {
        addAccessory("vc-translation", props => <TranslationAccessory message={props.message} />);

        addContextMenuPatch("message", messageCtxPatch);

        addButton("vc-translate", message => {
            if (!message.content) return null;

            return {
                label: "Translate",
                icon: TranslateIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: async () => {
                    const trans = await translate("received", message.content, settings.store.version);
                    handleTranslate(message.id, trans);
                }
            };
        });

        this.preSend = addPreSendListener(async (_, message) => {
            if (!settings.store.autoTranslate) return;
            if (!message.content) return;

            message.content = (await translate("sent", message.content, settings.store.version)).text;
        });
    },

    stop() {
        removePreSendListener(this.preSend);
        removeContextMenuPatch("message", messageCtxPatch);
        removeButton("vc-translate");
        removeAccessory("vc-translation");
    },

    chatBarIcon: (slateProps: any) => (
        <ErrorBoundary noop>
            <TranslateChatBarIcon slateProps={slateProps} />
        </ErrorBoundary>
    )
});

