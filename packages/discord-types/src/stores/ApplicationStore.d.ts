/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux/fluxActions";
import type { ApplicationRecord, ApplicationType } from "../general/ApplicationRecord";
import type { Nullish } from "../internal";
import type { FluxStore } from "./abstract/FluxStore";

export type ApplicationStoreAction = ExtractAction<FluxAction, "APPLICATIONS_FETCH" | "APPLICATIONS_FETCH_FAIL" | "APPLICATIONS_FETCH_SUCCESS" | "APPLICATION_FETCH" | "APPLICATION_FETCH_FAIL" | "APPLICATION_FETCH_SUCCESS" | "APPLICATION_SUBSCRIPTIONS_FETCH_ENTITLEMENTS_SUCCESS" | "BILLING_PAYMENTS_FETCH_SUCCESS" | "ENTITLEMENTS_FETCH_FOR_USER_SUCCESS" | "ENTITLEMENTS_GIFTABLE_FETCH_SUCCESS" | "GIFT_CODE_RESOLVE_SUCCESS" | "GUILD_APPLICATIONS_FETCH_SUCCESS" | "GUILD_SETTINGS_LOADED_INTEGRATIONS" | "INVITE_RESOLVE_SUCCESS" | "LIBRARY_FETCH_SUCCESS" | "LOAD_MESSAGES_SUCCESS" | "LOGOUT" | "OVERLAY_INITIALIZE" | "PAYMENT_UPDATE" | "STORE_LISTING_FETCH_SUCCESS" | "USER_RECENT_GAMES_FETCH_SUCCESS">;

export class ApplicationStore<Action extends FluxAction = ApplicationStoreAction> extends FluxStore<Action> {
    static displayName: "ApplicationStore";

    _getAllApplications(): ApplicationRecord[];
    didFetchingApplicationFail(applicationId: string): boolean;
    getApplication(applicationId: string): ApplicationRecord | undefined;
    getApplicationByName(applicationName?: string | Nullish): ApplicationRecord | undefined;
    getFetchingOrFailedFetchingIds(): string[];
    getGuildApplication(guildId: string | Nullish, applicationType: ApplicationType): ApplicationRecord | undefined;
    getGuildApplicationIds(guildId?: string | Nullish): string[];
    isFetchingApplication(applicationId: string): boolean;
}
