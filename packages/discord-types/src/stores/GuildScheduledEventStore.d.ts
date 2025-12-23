import { FluxStore } from "..";

export const enum GuildScheduledEventStatus {
    SCHEDULED = 1,
    ACTIVE = 2,
    COMPLETED = 3,
    CANCELED = 4
}

export const enum GuildScheduledEventEntityType {
    STAGE_INSTANCE = 1,
    VOICE = 2,
    EXTERNAL = 3
}

export const enum GuildScheduledEventPrivacyLevel {
    GUILD_ONLY = 2
}

export interface GuildScheduledEventEntityMetadata {
    location?: string;
}

export interface GuildScheduledEventRecurrenceRule {
    start: string;
    end: string | null;
    frequency: number;
    interval: number;
    byWeekday: number[] | null;
    byNWeekday: { n: number; day: number }[] | null;
    byMonth: number[] | null;
    byMonthDay: number[] | null;
    byYearDay: number[] | null;
    count: number | null;
}

export interface GuildScheduledEvent {
    id: string;
    guild_id: string;
    channel_id: string | null;
    creator_id: string | null;
    name: string;
    description: string | null;
    image: string | null;
    scheduled_start_time: string;
    scheduled_end_time: string | null;
    privacy_level: GuildScheduledEventPrivacyLevel;
    status: GuildScheduledEventStatus;
    entity_type: GuildScheduledEventEntityType;
    entity_id: string | null;
    entity_metadata: GuildScheduledEventEntityMetadata | null;
    sku_ids: string[];
    recurrence_rule: GuildScheduledEventRecurrenceRule | null;
    guild_scheduled_event_exceptions: unknown[];
    auto_start: boolean;
}

export interface GuildScheduledEventRsvp {
    guildScheduledEventId: string;
    userId: string;
    interested: boolean;
}

export interface GuildScheduledEventUsers {
    [userId: string]: unknown;
}

export class GuildScheduledEventStore extends FluxStore {
    getGuildScheduledEvent(eventId: string): GuildScheduledEvent | null;
    getGuildScheduledEventsForGuild(guildId: string): GuildScheduledEvent[];
    getGuildScheduledEventsByIndex(status: GuildScheduledEventStatus): GuildScheduledEvent[];
    getGuildEventCountByIndex(status: GuildScheduledEventStatus): number;
    getRsvpVersion(): number;
    getRsvp(eventId: string, recurrenceId: string | null, userId: string | null): GuildScheduledEventRsvp | null;
    isInterestedInEventRecurrence(eventId: string, recurrenceId: string | null): boolean;
    getUserCount(eventId: string, recurrenceId: string | null): number;
    hasUserCount(eventId: string, recurrenceId: string | null): boolean;
    isActive(eventId: string): boolean;
    getActiveEventByChannel(channelId: string): GuildScheduledEvent | null;
    getUsersForGuildEvent(eventId: string, recurrenceId: string | null): GuildScheduledEventUsers;
}
