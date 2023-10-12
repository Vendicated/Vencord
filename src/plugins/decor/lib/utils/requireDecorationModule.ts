/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByCode, wreq } from "@webpack";

export default async function requireDecorationModules() {
    // TODO: clean this up lol
    let modules = findByCode("isTryItOutFlow;").toString().match(/(Promise.all.+?\)\))/)?.[1].matchAll(/[0-9]+/g);
    if (modules) {
        modules = Array.from(modules);
        const last = modules.pop();
        return Promise.all(modules.map(m => wreq.e(m[0]))).then(wreq.bind(wreq, last[0]));
    }
}
