import { FluxStore } from "..";

export interface AuthorizedAppToken {
    id: string;
    application: { id: string; parent_id?: string | null;[key: string]: unknown; };
    scopes: string[];
}

export type AuthorizedAppsFetchState = "NOT_FETCHED" | "FETCHING" | "FETCHED";

export class AuthorizedAppsStore extends FluxStore {
    getNewestTokenForApplication(applicationId: string): AuthorizedAppToken | null;
    getNewestTokens(): AuthorizedAppToken[];
    getNewestTokensForNonChildrenApplications(): AuthorizedAppToken[];
    getFetchState(): AuthorizedAppsFetchState;
    getFetchStateForApplication(applicationId: string): AuthorizedAppsFetchState;
    getApplicationFetchStateVersion(): number;
}
