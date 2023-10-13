/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { canonicalizeMatch } from "@utils/patches";
import { wreq } from "@webpack";

export default async function extractAndRequireModuleIds(code: Function | string) {
    const chunksAndModule = code.toString()
        .match(canonicalizeMatch(/Promise\.all\(\[((?:\i\.\i\(\d+\),?)+)\]\).then\(\i\.bind\(\i,(\d+)\)\)/));

    if (!chunksAndModule) throw new Error("Couldn't find chunk and module requires");
    else if (!chunksAndModule[1]) throw new Error("Couldn't extract any chunk requires");
    else if (!chunksAndModule[2]) throw new Error("Couldn't extract module ID");

    const chunkIds = Array.from(chunksAndModule[1].matchAll(/(\d+)/g)).map(cId => parseInt(cId[0]));
    const moduleId = parseInt(chunksAndModule[2]);

    return Promise.all(chunkIds.map(i => wreq.e(i))).then(wreq.bind(wreq, moduleId));
}
