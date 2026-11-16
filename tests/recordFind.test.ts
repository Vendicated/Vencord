/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "@tests/setup";

import assert from "node:assert/strict";
import { it } from "node:test";

import { lazyWebpackSearchHistory, recordFind } from "@webpack";

it("records the canonical method and arguments only when reporting", () => {
    globalThis.IS_REPORTER = true;
    recordFind("findByProps", ["foo", "bar"]);
    assert.deepEqual(lazyWebpackSearchHistory.at(-1), ["findByProps", ["foo", "bar"]]);

    globalThis.IS_REPORTER = false;
    recordFind("find", ["ignored"]);
    assert.equal(lazyWebpackSearchHistory.at(-1)?.[0], "findByProps");
});
