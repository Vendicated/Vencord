/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CommandArgument, Guild } from "@vencord/discord-types";
import { Constants, RestAPI } from "@webpack/common";
import PKAPI, { Member, System, SystemAutoproxySettings } from "pkapi.js";

export function CmdArgToDict(args: CommandArgument[]): Record<string, any> {
    return Object.fromEntries(args.map(v => [v.name, v.value]));
}

export async function UpdateProfile(args: Record<string, any>) {
    return RestAPI.patch({
        url: Constants.Endpoints.ME,
        body: args
    });
}

export async function SetAutoproxy(pkClient: PKAPI, member: Member | null, cache: PKCache, guild: Guild | null = null, mode: string = "member"): Promise<boolean> {
    const guild_id = guild ? guild.id : "0"; // 0 = DMs
    const autoproxy = cache.autoproxy.find(e => e.guild === guild_id);

    const req = await pkClient.patchSystemAutoproxySettings({ guild: guild_id, autoproxy_member: member?.id, autoproxy_mode: mode, token: cache.token() });

    if (autoproxy === undefined) cache.autoproxy.push(req);
    else if (req !== autoproxy) cache.autoproxy[cache.autoproxy.findIndex(e => e.guild === guild_id)] = req;
    else return false;

    return true;
}

export interface PKCache {
    isReady: boolean,
    token: () => string,
    autoproxy: SystemAutoproxySettings[],
    system: System,
    userId: string;
}
