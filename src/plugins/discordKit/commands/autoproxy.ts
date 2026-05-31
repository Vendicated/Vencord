/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PKCache, SetAutoproxy, UpdateProfile } from "@plugins/discordKit/utils";
import { CommandContext, CommandReturnValue } from "@vencord/discord-types";
import PKAPI from "pkapi.js";

export default async function (pkClient: PKAPI, cache: PKCache, ctx: CommandContext, args: Record<string, any>): Promise<CommandReturnValue> {
    if (cache.isReady)
        return {
            content: await (
                args.mode ? mode(pkClient, cache, ctx, args) :
                    args.member ? member(pkClient, cache, ctx, args) :
                        _default(pkClient, cache, ctx)
            )
        };
    return { content: "DiscordKit is not ready." };
}

async function mode(pkClient: PKAPI, cache: PKCache, ctx: CommandContext, args: Record<string, any>): Promise<string> {
    const request = await SetAutoproxy(pkClient, null, cache, ctx.guild, args.mode);
    if (request === false) return "Autoproxy settings unchanged.";

    switch (args.mode) {
        case "off":
            await UpdateProfile({
                bio: cache.system.description ?? "",
                "global_name": cache.system.name,
                "banner_color": `#${cache.system.color ?? ""}`
            });
            break;
    }

    return `Autoproxy mode set to ${args.mode}.`;
}

async function member(pkClient: PKAPI, cache: PKCache, ctx: CommandContext, args: Record<string, any>): Promise<string> {
    const member = ([...cache.system.members].find(e => e[1].name === args.member || e[1].id === args.member))[1];
    const request = await SetAutoproxy(pkClient, member, cache, ctx.guild);

    if (request === false) return "Autoproxy settings unchanged.";

    const update = await UpdateProfile({
        "bio": member.description ?? "",
        "global_name": member.name,
        "banner_color": `#${member.color ?? ""}`
    }).then(r => `Autoproxy set to ${member.name} (${member.id}`).catch(e => e.message);

    return update;
}

async function _default(pkClient: PKAPI, cache: PKCache, ctx: CommandContext): Promise<string> {
    if (ctx.guild !== undefined) {
        let data = cache.autoproxy.find(e => e.guild === ctx.guild?.id);
        if (data === undefined) {
            cache.autoproxy.push(await pkClient.getSystemAutoproxySettings({ guild: ctx.guild.id, token: cache.token() }));
            data = cache.autoproxy.find(e => e.guild === ctx.guild?.id);
            if (data === undefined)
                return `Failed to create autoproxy cache for guild \`${ctx.guild?.id}\``;
        }

        return [
            `__Autoproxy settings for ${ctx.guild.name}__`,
            data?.autoproxy_member ? `Member: ${data.autoproxy_member}` : "",
            `Mode: ${data?.autoproxy_mode}`,
            data?.last_latch_timestamp ? `Last latch timestamp: ${data.last_latch_timestamp}` : ""
        ].join("\n").replaceAll("\n\n", "\n");
    } else {
        const data = cache.autoproxy.find(e => e.guild === "0");
        return [
            "__Autoproxy settings for DMs__",
            data?.autoproxy_member ? `Member: ${data.autoproxy_member}` : "",
            `Mode: ${data?.autoproxy_mode}`,
            data?.last_latch_timestamp ? `Last latch timestamp: ${data.last_latch_timestamp}` : ""
        ].join("\n").replaceAll("\n\n", "\n");
    }
}
