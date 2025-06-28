import User from './User';
import Role from './Role';
import Constants from '../other/Constants';

export class Guild {
    constructor(guild: object);
    afkChannelId: string | undefined;
    afkTimeout: number;
    applicationCommandCounts: {
        0: number;
        1: number;
        2: number;
    };
    application_id: unknown;
    banner: string | undefined;
    defaultMessageNotifications: number;
    description: string | undefined;
    discoverySplash: string | undefined;
    explicitContentFilter: number;
    features: Set<keyof Constants['GuildFeatures']>;
    hubType: unknown;
    icon: string | undefined;
    id: string;
    joinedAt: Date;
    maxMembers: number;
    maxVideoChannelUsers: number;
    mfaLevel: number;
    name: string;
    nsfwLevel: number;
    ownerId: string;
    preferredLocale: string;
    premiumProgressBarEnabled: boolean;
    premiumSubscriberCount: number;
    premiumTier: number;
    publicUpdatesChannelId: string | undefined;
    roles: Record<string, Role>;
    rulesChannelId: string | undefined;
    splash: string | undefined;
    systemChannelFlags: number;
    systemChannelId: string | undefined;
    vanityURLCode: string | undefined;
    verificationLevel: number;

    get acronym(): string;

    getApplicationId(): unknown;
    getIconSource(size: string | number, canAnimate: boolean): { uri: string; };
    getIconURL(size: string | number, canAnimate: boolean): string;
    getMaxEmojiSlots(): number;
    getRole(roleId: string): Role;
    hasFeature(feature: keyof Constants['GuildFeatures']): boolean;
    hasVerificationGate(): boolean;
    isLurker(): boolean;
    isNew(newerThanDays?: number): boolean;
    isOwner(user: User): boolean;
    isOwnerWithRequiredMfaLevel(user: User): boolean;
    toString(): string; // override that is identical to Guild.name
}
