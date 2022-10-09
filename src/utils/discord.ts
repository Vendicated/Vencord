import { Guild } from "discord-types/general";
import { ChannelStore, SelectedChannelStore, GuildStore } from "../webpack/common";

export function getCurrentChannel() {
    return ChannelStore.getChannel(SelectedChannelStore.getChannelId());
}

export function getCurrentGuild(): Guild | undefined {
    return GuildStore.getGuild(getCurrentChannel()?.guild_id);
}
