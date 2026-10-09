/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Span } from "@components/Span";
import { daysUntil, getBirthday } from "@plugins/birthdays/data";
import { settings } from "@plugins/birthdays/settings";
import { cl, formatBirthday, formatRelative, formatUpcomingAge } from "@plugins/birthdays/utils";
import type { User } from "@vencord/discord-types";
import { Clickable, Tooltip } from "@webpack/common";
import type { ComponentType, PropsWithChildren } from "react";

import { openBirthdayEditModal } from "./BirthdayEditModal";
import { GiftIcon } from "./icons";

type SectionComponent = ComponentType<PropsWithChildren<{
    heading: string;
    headingIcon?: ComponentType<any>;
}>>;

interface Props {
    user: User;
    Section: SectionComponent;
}

export function ProfileBirthday({ user, Section }: Props) {
    const userId = user?.id;
    settings.use(["birthdays"]);

    const birthday = userId == null ? undefined : getBirthday(userId);
    if (birthday == null) return null;

    const days = daysUntil(birthday);
    const age = formatUpcomingAge(birthday);

    const detail = days === 0
        ? `Today${age == null ? "" : ` · ${age}`}`
        : `${formatRelative(days)}${age == null ? "" : ` · ${age}`}`;

    return (
        <Section heading="Birthday" headingIcon={GiftIcon}>
            <Tooltip text="Click to edit">
                {tooltipProps => (
                    <Clickable
                        {...tooltipProps}
                        className={cl("section-value", { today: days === 0 })}
                        onClick={() => {
                            tooltipProps.onClick?.();
                            openBirthdayEditModal(userId);
                        }}
                    >
                        <Span size="sm" weight="medium" defaultColor={false}>{formatBirthday(birthday)}</Span>
                        <Span size="xs" defaultColor={false} className={cl("section-detail")}>{detail}</Span>
                        {days === 0 && <span>🎉</span>}
                    </Clickable>
                )}
            </Tooltip>
        </Section>
    );
}