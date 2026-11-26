/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    trustedAppIds: {
        type: OptionType.STRING,
        description: "Comma-separated application IDs allowed to request guilds.join",
        default: ""
    }
});

export default definePlugin({
    name: "NoOauthJoinScope",
    description: "Removes the guilds.join scope from OAuth2 authorization requests.",
    authors: [Devs.HappyEnderman],
    settings,

    patches: [
        {
            find: "OAUTH2_AUTHORIZE_WEBHOOK_CHANNELS",
            replacement: {
                match: /(client_id:(\i),.{0,250}?scope:)(\i)\.join\(" "\)/g,
                replace: "$1$self.filterScopes($3,$2).join(\" \")"
            }
        },
        {
            find: "hasContentBackground",
            replacement: {
                match: /(application:(\i),accountScopes:\i,requestedScopes:\i,.{0,1500}?\.map\((\i)=>\(0,\i\.\i\)\(\3,\i\)\.map\(\((\i),\i\)=>\(0,\i\.jsx\)\(\i,\{text:)\4(?=,error:)/,
                replace: "$1$self.scopeText($3,$4,$2?.id),isFake:$self.isBlocked($3,$2?.id)"
            }
        }
    ],

    isBlocked(scope: string, clientId: string | undefined) {
        return scope === "guilds.join" && !settings.store.trustedAppIds.split(",").some(id => id.trim() === clientId);
    },

    scopeText(scope: string, text: string, clientId: string | undefined) {
        return this.isBlocked(scope, clientId) ? "Joining servers for you is blocked" : text;
    },

    filterScopes(scopes: string[], clientId: string) {
        return Array.isArray(scopes) ? scopes.filter(scope => !this.isBlocked(scope, clientId)) : scopes;
    }
});
