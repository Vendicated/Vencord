/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ImmutableRecord } from "./ImmutableRecord";

export type CompanyRecordOwnProperties = Pick<CompanyRecord, "id" | "name">;

export declare class CompanyRecord<
    OwnProperties extends CompanyRecordOwnProperties = CompanyRecordOwnProperties
> extends ImmutableRecord<OwnProperties> {
    constructor(companyProperties: CompanyRecordOwnProperties);

    static createFromServer(companyFromServer: CompanyRecordOwnProperties): CompanyRecord;

    id: string;
    name: string;
}
