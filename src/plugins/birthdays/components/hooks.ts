/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useAwaiter } from "@utils/react";
import type { User } from "@vencord/discord-types"; 
import { UserStore, UserUtils } from "@webpack/common"; 

export function useUser(userId: string): User | undefined {
    const cached = UserStore.getUser(userId);

    const [fetched] = useAwaiter<User | undefined>(
        async () => cached ?? await UserUtils.getUser(userId).catch(() => undefined),
        { fallbackValue: cached, deps: [userId] }
    );
 
    return fetched ?? cached;
}