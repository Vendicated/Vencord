/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// As vencord uses 3 decade old typescript I need to have this header file
// see https://stackoverflow.com/questions/76400750/intl-supportedvaluesof-property-supportedvaluesof-does-not-exist-on-type-type
// https://github.com/microsoft/TypeScript/issues/49231
declare namespace Intl {
    type Key = "calendar" | "collation" | "currency" | "numberingSystem" | "timeZone" | "unit";

    function supportedValuesOf(input: Key): string[];
}
