/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { canonicalizeMatch } from "@utils/patches";
import { wreq } from "@webpack";

export default async function extractAndRequireModuleIds(code: Function | string) {
    const chunksAndModule = code.toString()
        .match(canonicalizeMatch(/await \i\.\i\("(\d+)"\)/));

    if (!chunksAndModule) throw new Error("Couldn't find chunk & module requires");
    else if (!chunksAndModule[1]) throw new Error("Couldn't extract module id");

    const moduleId = chunksAndModule[1];

    // @ts-expect-error discord-types needs updating to include el constant
    return wreq.el(moduleId).then(wreq.bind(wreq, moduleId));

}
