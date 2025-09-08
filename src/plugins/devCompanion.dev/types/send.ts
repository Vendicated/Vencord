/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ReporterData } from "debug/reporterData";

export type OutgoingMessage = Base<DiffModule | ExtractModule | ModuleList | RawId | I18nValue | VersionResponse>;
export type FullOutgoingMessage = OutgoingMessage & Nonce;

export type Base<T> = ({
    ok: true;
} & T) | ({
    ok: false;
    data: null;
    error: string;
} & Omit<T, "data">);

export type Nonce = {
    nonce: number;
};
export type ModuleResult = {
    moduleNumber: number;
    /**
     * a list of plugins that patched this module, if it was patched, otherwise an empty array
     *
     * if the module was patched, but the returned module is the original, they array will still be empty
     *
     * if {@link ExtractModule.data|ExtractModule.data.find} is true, this will be a list of what patched the entire module (not just the part that was found)
     */
    patchedBy: string[];
};

// #region valid payloads
export type I18nValue = {
    type: "i18n";
    data: {
        value: string;
    };
};

export type Report = {
    type: "report";
    data: ReporterData;
};

export type DiffModule = {
    type: "diff";
    data: {
        source: string;
        patched: string;
    } & ModuleResult;
};

export type ExtractModule = {
    type: "extract";
    data: {
        module: string;
        /**
         * if the module is incomplete. ie: from a find
         */
        find?: boolean;
    } & ModuleResult;
};

export type ModuleList = {
    type: "moduleList";
    data: {
        modules: string[];
    };
};
/**
 * @deprecated use extractModule with usePatched instead
 */
export type RawId = {
    /**
     * @deprecated use extractModule with usePatched instead
     */
    type: "rawId";
    data: string;
};

export type VersionResponse = {
    type: "version";
    data: {
        clientVersion: readonly [number, number, number];
    };
};
// #endregion
