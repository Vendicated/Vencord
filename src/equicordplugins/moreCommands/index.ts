/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated, Samu and contributors
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

import { addMessagePreEditListener, addMessagePreSendListener, MessageObject, removeMessagePreEditListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { migratePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

import choice from "./commands/choice";
import misc from "./commands/misc";
import system from "./commands/system";
import text from "./commands/text";
import time from "./commands/time";
import { settings, uwuify, uwuifyArray } from "./utils";

migratePluginSettings("MoreCommands", "CuteAnimeBoys", "CuteNekos", "CutePats", "Slap");
export default definePlugin({
    name: "MoreCommands",
    description: "Adds various fun and useful commands",
    authors: [Devs.Arjix, Devs.amy, Devs.Samu, EquicordDevs.zyqunix, EquicordDevs.ShadyGoat, Devs.thororen, Devs.Korbo, Devs.nyx, Devs.amy],
    settings,
    commands: [
        ...choice,
        ...system,
        ...text,
        ...time,
        ...misc,
    ],
    patches: [
        {
            find: ".isPureReactComponent=!0;",
            predicate: () => settings.store.uwuEverything && settings.store.uwuify,
            replacement: {
                match: /(?<=.defaultProps\)void 0.{0,60})(\i)\)/,
                replace: "$self.uwuifyProps($1))"
            }
        }
    ],
    uwuifyProps(props: any) {
        if (!props.children) return props;
        if (typeof props.children === "string") props.children = uwuify(props.children);
        else if (Array.isArray(props.children)) props.children = uwuifyArray(props.children);
        return props;
    },

    onSend(msg: MessageObject) {
        // Only run when it's enabled
        if (settings.store.uwuEveryMessage && settings.store.uwuify) {
            msg.content = uwuify(msg.content);
        }
    },

    start() {
        this.preSend = addMessagePreSendListener((_, msg) => this.onSend(msg));
        this.preEdit = addMessagePreEditListener((_cid, _mid, msg) =>
            this.onSend(msg)
        );
    },

    stop() {
        removeMessagePreSendListener(this.preSend);
        removeMessagePreEditListener(this.preEdit);
    },
});
