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
import definePlugin from "@utils/types";
import { ChannelStore, Menu } from "@webpack/common";

import { settings } from "./settings";
import { TranslateChatBarIcon, TranslateIcon } from "./TranslateIcon";
import { handleTranslate, TranslationAccessory } from "./TranslationAccessory";
import { translate } from "./utils";

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }) => () => {
    if (!message.content) return;

    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;

    group.splice(group.findIndex(c => c?.props?.id === "copy-text") + 1, 0, (
        <Menu.MenuItem
            id="vc-trans"
            label="Translate"
            icon={TranslateIcon}
            action={async () => {
                const trans = await translate("received", message.content);
                handleTranslate(message.id, trans);
            }}
        />
    ));
};

export default definePlugin({
    name: "Translate",
    description: "Translate messages with Google Translate",
    authors: [Devs.Ven],
    dependencies: ["MessageAccessoriesAPI", "MessagePopoverAPI", "MessageEventsAPI"],
    settings,
    // not used, just here in case some other plugin wants it or w/e
    translate,

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
                    const trans = await translate("received", message.content);
                    handleTranslate(message.id, trans);
                }
            };
        });

        this.preSend = addPreSendListener(async (_, message) => {
            if (!settings.store.autoTranslate) return;
            if (!message.content) return;

            message.content = (await translate("sent", message.content)).text;
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
