/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getBirthday } from "@plugins/birthdays/data";
import { settings } from "@plugins/birthdays/settings";
import type { User } from "@vencord/discord-types";
import { findComponentByCodeLazy } from "@webpack";
import type { ComponentType } from "react";

import { openBirthdayEditModal } from "./BirthdayEditModal";
import { GiftIcon } from "./icons";

const ProfileActionIconButton = findComponentByCodeLazy<{
    icon: ComponentType<any>;
    tooltipText: string;
    onClick(): void;
}>('"aria-busy"', "SPINNING_CIRCLE", "tooltipText");

export function ProfileActionButton({ user }: { user: User; }) {
    settings.use(["birthdays"]);

    const userId = user?.id;
    if (userId == null) return null;

    const hasBirthday = getBirthday(userId) != null;

    return (
        <ProfileActionIconButton
            icon={GiftIcon}
            tooltipText={hasBirthday ? "Edit Birthday" : "Set Birthday"}
            onClick={() => openBirthdayEditModal(userId)}
        />
    );
}