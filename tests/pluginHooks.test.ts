/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "@tests/setup";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bindHooks, getBoundHookKeys, getRequiredApis } from "@api/pluginHooks";

describe("pluginHooks", () => {
    it("binds every hook plus toolboxActions", () => {
        const keys = getBoundHookKeys();

        assert.equal(keys.length, 7);
        assert.ok(keys.includes("toolboxActions"));
    });

    it("binds object-form hooks method by method", () => {
        const plugin: any = {
            onMessageClick: function (this: any) { return this.name; },
            toolboxActions: { action: function (this: any) { return this.name; } },
            name: "Test"
        };

        bindHooks(plugin, ["onMessageClick", "toolboxActions"]);

        assert.equal(plugin.onMessageClick(), "Test");
        assert.equal(plugin.toolboxActions.action(), "Test");
    });

    it("derives required API plugins from hook presence", () => {
        const apis = getRequiredApis({
            commands: [{ name: "x" }],
            chatBarButton: {},
            onMessageClick: () => {},
            renderMessageDecoration: () => {}
        });

        assert.deepEqual(apis, ["CommandsAPI", "ChatInputButtonAPI", "MessageEventsAPI", "MessageDecorationsAPI"]);
    });

    it("ignores an empty array", () => {
        assert.deepEqual(getRequiredApis({ commands: [] }), []);
    });
});
