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

import { definePluginSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import ErrorBoundary from "@components/ErrorBoundary";
import { SafetyIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { Tooltip } from "@webpack/common";

enum ShowText {
    NONE,
    TEXT,
    ICON
}

const settings = definePluginSettings({
    showText: {
        description: "Should text or an icon be shown?",
        type: OptionType.SELECT,
        options: [
            { label: "Don't show anything", value: ShowText.NONE, default: true },
            { label: "Text over the message", value: ShowText.TEXT },
            { label: "A small icon next to the username", value: ShowText.ICON },
        ],
    }
});

export default definePlugin({
    name: "iLoveSpam",
    description: "Do not hide messages from 'likely spammers'",
    authors: [Devs.botato, Devs.Nyako, Devs.C1200],
    settings,
    patches: [
        {
            find: "hasFlag:{writable",
            replacement: {
                match: /if\((\i)<=(?:0x40000000|(?:1<<30|1073741824))\)return/,
                replace:
                    "if($1===(1<<20)){if(((this.flags|this.publicFlags)&(1<<20))===(1<<20))$self.spammers.add(this.id);return false;}$&",
            },
        },
        {
            find: "showCommunicationDisabledStyles",
            replacement: {
                match: /(message:(\i),avatar:\i,username:\(0,\i.jsxs\)\(\i.Fragment,\{children:\[)/,
                replace: "$1$self.Tooltip({ message: $2, spammers: $self.spammers }),",
            },
        },
    ],

    Tooltip: ErrorBoundary.wrap(({ message, spammers }: { message: Message; spammers: Set<string> }) => {
        const string = "This user is apparently a spammer";

        if (!spammers.has(message.author.id) || settings.store.showText === ShowText.NONE) {
            return null;
        } else if (settings.store.showText === ShowText.TEXT) {
            return (
                <BaseText size="md" weight="normal" style={{ color: "var(--text-muted)" }}>
                    <SafetyIcon width={12} height={12} /> {string}
                </BaseText>
            );
        } else if (settings.store.showText === ShowText.ICON) {
            return (
                <Tooltip text={string}>
                    {props => <SafetyIcon {...props} width={12} height={12} style={{ marginRight: 4 }} />}
                </Tooltip>
            );
        }
    }, { noop: true }),

    spammers: new Set(),
});
