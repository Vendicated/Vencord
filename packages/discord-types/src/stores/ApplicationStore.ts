/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Store } from "../flux/Store";
import type { ApplicationRecord, ApplicationType } from "../general/ApplicationRecord";
import type { Nullish } from "../internal";

export declare class ApplicationStore extends Store {
    static displayName: "ApplicationStore";

    _getAllApplications(): ApplicationRecord[];
    didFetchingApplicationFail(applicationId: string): boolean;
    getApplication(applicationId: string): ApplicationRecord | undefined;
    getApplicationByName(applicationName?: string | Nullish): ApplicationRecord | undefined;
    getApplicationLastUpdated(applicationId: string): number | undefined;
    getFetchingOrFailedFetchingIds(): string[];
    getGuildApplication(guildId: string | Nullish, applicationType: ApplicationType): ApplicationRecord | undefined;
    getGuildApplicationIds(guildId?: string | Nullish): string[];
    isFetchingApplication(applicationId: string): boolean;
}
