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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    suppressByDefault: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Make role and user mentions silent by default"
    },
    inversionPrefix: {
        type: OptionType.STRING,
        default: "@",
        description: "Prefix a mention with this to override the default (autocomplete will work!)"
    },
});

export default definePlugin({
    name: "SilentMentions",
    description: "Make @-links without actually mentioning the user or role",
    authors: [Devs._31a],

    patches: [{
        // do as late as possible to ensure that it happens after anything
        // potentially modifies the message and adds a mention
        find: /handleSend\(/,
        replacement: [{
            match: /body:(\w+)/,
            replace: "body: $self.alter($1)"
        }]
    },{
        find: /startsWith\(.+?sentinel/,
        replacement: [{
            // this ensures that the autocomplete popup is shown
            match: /(if\(!(\w+)\.startsWith\((\w+\.sentinel)\)\)return!1)/,
            replace: "if ($3 == '@' && $2.startsWith($self.sentinel())){$2=$2.substring($self.sentinel().length)}else $1"
        }, {
            // this modifies the autocomplete filter to be correct
            match: /(else if\(null!=(\w+)&&\w+\(.+?typeInfo:(\w+).+?query:\w+.substring\()(.+?)\)}/,
            replace: "$1$3.sentinel=='@' && $2.startsWith($self.sentinel()) ? $self.sentinel().length : $4)}"
        }]
    },{
        find: /return"<@&".concat/,
        replacement: [{
            // this avoids deletion of the prefix on autocomplete accept
            match: /(onSelect\((\w+)\).+?!1;)(.+?Information\),)(.+?insertText\(\w+\(\w+\),)/,
            replace: "$1const _p = $2.options.currentFullWord.startsWith($self.sentinel()) ? $self.prefix() : '';$3_p+$4_p+"
        }]
    }],

    settings,

    prefix() {
        return settings.store.inversionPrefix;
    },

    sentinel() {
        return settings.store.inversionPrefix + "@";
    },

    alter(p) {
        let content = p.content;
        const prefix = settings.store.inversionPrefix;
        const prefixlen = prefix.length;

        let users = [];
        let roles = [];

        console.dir(p);

        if (settings.store.suppressByDefault) {
            const prefix_regex = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const user_regex = RegExp(`${prefix_regex}(<@!?(\\d+)>)`, 'g');
            const role_regex = RegExp(`${prefix_regex}(<@&(\\d+)>)`, 'g');

            content = content.replace(user_regex, (_, p1, p2) => {
                users.push(p2);
                return p1;
            });
            content = content.replace(role_regex, (_, p1, p2) => {
                roles.push(p2);
                return p1;
            });
        } else {
            const user_regex = RegExp(`(.{0,${prefixlen}})(<@!?(\\d+)>)`, 'g');
            const role_regex = RegExp(`(.{0,${prefixlen}})(<@&(\\d+)>)`, 'g');

            content = content.replace(user_regex, (m, p1, p2, p3) => {
                if (p1 == prefix) return p2;
                users.push(p3);
                return m;
            });
            content = content.replace(role_regex, (m, p1, p2, p3) => {
                if (p1 == prefix) return p2;
                roles.push(p3);
                return m;
            });
        }

        if (!p.allowed_mentions) p.allowed_mentions = {};
        p.allowed_mentions.users = users;
        p.allowed_mentions.roles = roles;

        if (p.allowed_mentions.replied_user === undefined)
            p.allowed_mentions.replied_user = true;

        p.content = content;

        return p;
    }
});
