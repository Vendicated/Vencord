/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";

import { removeHiddenUser, STORE_KEY, userIds } from "./store";

export const events = {
    // It gets changed in definePlugin.listen
    // Tricky, but helps to forceUpdate list of messages
    useListener: () => { }
};

export const removeIgnore = (userId: string) => {
    removeHiddenUser(userId);
    events.useListener();
    DataStore.set(STORE_KEY, userIds);
};
export const createIgnore = (userId: string, write = true) => {
    if (!userIds.includes(userId))
        userIds.push(userId);
    events.useListener();
    if (write)
        DataStore.set(STORE_KEY, userIds);
};
