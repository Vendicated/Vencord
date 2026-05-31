/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CommandArgument } from "@vencord/discord-types";
import { RestAPI } from "@webpack/common";
import { SystemAutoproxySettings } from "pkapi.js";

export function CmdArgToDict(args: CommandArgument[]): Record<string, any> {
    return Object.fromEntries(args.map(v => [v.name, v.value]));
}

export async function UpdateProfile(args: any) {
    return RestAPI.patch({
        url: "/users/@me",
        body: args
    }).then(r => r).catch(e => e);
}

export interface PKCache {
    token: () => string,
    autoproxy: SystemAutoproxySettings[],
    system: any,
    userId: string;
}
