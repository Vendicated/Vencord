import { Channel, Guild } from "discord-types/general";
import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";
import { findByProps, findAllByProps } from "../webpack";
import { GuildStore, ChannelStore, FluxDispatcher } from "../webpack/common";

interface IChannelCreate {
    type: "CHANNEL_CREATE";
    guildHashes: {};
    channel: Channel;
}

interface IChannelUpdates {
    type: "CHANNEL_UPDATES";
    updates: {
        guildHashes: {};
        channel: Channel;
    }[];
}

interface IGuild {
    type: "GUILD_CREATE" | "GUILD_UPDATE";
    guildHashes?: {};
    guild: Guild;
}

let provider;

let oldDefaultStrs;
let oldStrs;

const FACE_CHANCE = 30;

const faces = [
    "(o´∀`o)",
    "(#｀ε´)",
    "(๑•̀ㅁ•́๑)✧",
    "(*≧m≦*)",
    "(・`ω´・)",
    "UwU",
    "OwO",
    ">w<",
    "｡ﾟ( ﾟ^∀^ﾟ)ﾟ｡",
    "ヾ(｀ε´)ﾉ",
    "(´• ω •`)",
    "o(>ω<)o",
    "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧",
    "(⁀ᗢ⁀)",
    "(￣ε￣＠)",
    "( 〃▽〃)",
    "(o^ ^o)",
];

const guildCache = new Map<string, string>();
const channelCache = new Map<string, string>();

const transform = (text: string) => {
    let out = "";
    let level = 0;
    const chars = text.split("");
    for (let i = 0; i < chars.length; i++) {
        switch (chars[i]) {
            case "[":
            case "(":
            case "{":
                out += chars[i];
                level++;
                break;
            case "]":
            case ")":
            case "}":
                out += chars[i];
                level--;
                break;
            case "!": {
                out += chars[i];

                if (level !== 0 || !(chars[i - 1] !== "}" && chars[i - 2] !== "}" && chars[i + 1] !== "{" && chars[i + 2] !== "{") || chars[i + 1] === "!") {
                    break;
                }

                const face = faces[Math.floor(Math.random() * faces.length)];
                out += " " + face + " ";
                continue;
            }
            default: {
                if (level === 0) {
                    out += chars[i].replace(/[rl]/g, "w").replace(/[RL]/g, "W");
                } else {
                    out += chars[i];
                }
                break;
            }
        }

        if (i === chars.length - 1) {
            if (Math.floor(Math.random() * 100) < FACE_CHANCE) {
                const face = faces[Math.floor(Math.random() * faces.length)];
                out += " " + face + " ";
            }
        }
    }

    return out.trim();
};

const transformChannel = (channel: Channel) => {
    channelCache.set(channel.id, channel.name);
    channel.name = channel.name === channel.name.replace(/\s+/g, "-").toLowerCase() ? transform(channel.name).replace(/\s+/g, "-").toLowerCase() : transform(channel.name);
};

const transformGuild = (guild: Guild) => {
    guildCache.set(guild.id, guild.name);
    guild.name = transform(guild.name);
};

const channelCreate = (e: IChannelCreate) => transformChannel(e.channel);

const channelUpdates = (e: IChannelUpdates) => e.updates.forEach(({ channel }) => channelCache.get(channel.id) !== channel.name ? transformChannel(ChannelStore.getChannel(channel.id)) : null);

const guildCreateOrUpdate = (e: IGuild) => transformGuild(GuildStore.getGuild(e.guild.id));

export default definePlugin({
    name: "OwOifier",
    description: "Owoify menus, channews, and guiwds! OwO",
    authors: [
        {
            name: "Ben!",
            id: 255834596766253057n
        },
        Devs.BanTheNons
    ],

    dependencies: ["CommandsAPI"],

    start: () => {
        provider = findAllByProps("getLanguages").find(mod => Object.keys(mod.Messages).length)._provider;

        oldDefaultStrs = { ...provider._context.defaultMessages };
        oldStrs = { ...findByProps("COMMAND_NICK_SUCCESS").exports };

        const newStrs = Object.fromEntries(Object.entries(oldStrs).map(([name, str]) => typeof str === "string" ? [name, transform(str)] : [name, str]));
        const newDefaultStrs = Object.fromEntries(Object.entries(oldDefaultStrs).map(([name, str]) => typeof str === "string" ? [name, transform(str)] : [name, str]));

        provider.refresh({ messages: newStrs, defaultMessages: newDefaultStrs, locale: "en-US" });

        Object.values(GuildStore.getGuilds()).forEach(guild => {
            transformGuild(guild);

            // @ts-ignore
            const channels: Channel[] = ChannelStore.getMutableGuildChannelsForGuild(guild.id);
            Object.values(channels).forEach(transformChannel);
        });

        FluxDispatcher.subscribe("CHANNEL_CREATE", channelCreate);
        FluxDispatcher.subscribe("CHANNEL_UPDATES", channelUpdates);

        FluxDispatcher.subscribe("GUILD_CREATE", guildCreateOrUpdate);
        FluxDispatcher.subscribe("GUILD_UPDATE", guildCreateOrUpdate);
    },

    stop: () => {
        provider.refresh({ messages: oldStrs, defaultMessages: oldDefaultStrs, locale: "en-US" });

        Object.values(GuildStore.getGuilds()).forEach(guild => {
            guild.name = guildCache.get(guild.id) ?? "";

            // @ts-ignore
            const channels: Channel[] = ChannelStore.getMutableGuildChannelsForGuild(guild.id);
            Object.values(channels).forEach(channel => {
                channel.name = channelCache.get(channel.id) ?? "";
            });
        });

        FluxDispatcher.unsubscribe("CHANNEL_CREATE", channelCreate);
        FluxDispatcher.unsubscribe("CHANNEL_UPDATE", channelUpdates);

        FluxDispatcher.unsubscribe("GUILD_CREATE", guildCreateOrUpdate);
        FluxDispatcher.unsubscribe("GUILD_UPDATE", guildCreateOrUpdate);
    },
});
