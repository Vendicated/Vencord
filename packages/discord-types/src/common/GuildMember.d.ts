import { GuildMemberFlags } from "../../enums";
import { Collectibles, DisplayNameStyles } from "./Channel";

export interface GuildMember {
    avatar: string | null | undefined;
    avatarDecoration: string | null | undefined;
    collectibles: Collectibles | null;
    colorRoleId: string | undefined;
    colorString: string | undefined;
    colorStrings: {
        primaryColor: string | undefined;
        secondaryColor: string | undefined;
        tertiaryColor: string | undefined;
    } | null;
    communicationDisabledUntil: string | null | undefined;
    displayNameStyles: DisplayNameStyles | null;
    flags: GuildMemberFlags;
    fullProfileLoadedTimestamp: number | undefined;
    guildId: string;
    highestRoleId: string | undefined;
    hoistRoleId: string | undefined;
    iconRoleId: string | undefined;
    isPending: boolean | undefined;
    joinedAt: string | undefined;
    nick: string | null | undefined;
    premiumSince: string | null | undefined;
    roles: string[];
    unusualDMActivityUntil: string | undefined;
    userId: string;
}
