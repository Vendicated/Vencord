import { Application, FluxStore } from "..";
import { ApplicationType } from "../../enums";

export interface ApplicationStoreState {
    botUserIdToAppUsage: Record<string, ApplicationUsage>;
}

export interface GuildEmbeddedApplication {
    applicationId: string;
    status: unknown;
}

export interface ApplicationUsage {
    applicationId: string;
    lastUsedMs: number;
}

export class ApplicationStore extends FluxStore {
    _getAllApplications(): Application[];
    getState(): ApplicationStoreState;
    getApplication(applicationId: string): Application | undefined;
    getApplicationByName(name: string): Application | undefined;
    getApplicationLastUpdated(applicationId: string): number | undefined;
    getGuildApplication(guildId: string, type: ApplicationType): Application | undefined;
    getGuildApplicationIds(guildId: string): string[];
    getGuildEmbeddedApplications(guildId: string, surface: string): GuildEmbeddedApplication[] | undefined;
    getAppIdForBotUserId(botUserId: string): string | undefined;
    getFetchingOrFailedFetchingIds(): string[];
    isFetchingApplication(applicationId: string): boolean;
    isHydrated(applicationId: string): boolean;
    didFetchingApplicationFail(applicationId: string): boolean;
}
