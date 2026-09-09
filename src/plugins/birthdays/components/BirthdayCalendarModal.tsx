/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Paragraph } from "@components/Paragraph";
import { Span } from "@components/Span";
import { getBirthdaysOn, getUpcoming, occurrenceInYear, startOfDay } from "@plugins/birthdays/data";
import { settings } from "@plugins/birthdays/settings";
import { Birthday } from "@plugins/birthdays/types";
import { cl, formatBirthday, formatRelative, formatUpcomingAge } from "@plugins/birthdays/utils";
import { getUniqueUsername, openUserProfile } from "@utils/discord";
import type { RenderModalProps } from "@vencord/discord-types";
import { Avatar, Clickable, Modal, moment, openModal, ScrollerThin, TabBar, Tooltip, useState } from "@webpack/common";

import { openBirthdayEditModal } from "./BirthdayEditModal";
import { useUser } from "./hooks";

const enum Tab {
    Upcoming,
    Calendar
}

export function openBirthdayCalendarModal() {
    openModal(modalProps => (
        <ErrorBoundary>
            <BirthdayCalendarModal modalProps={modalProps} />
        </ErrorBoundary>
    ));
}

function BirthdayCalendarModal({ modalProps }: { modalProps: RenderModalProps; }) {
    settings.use(["birthdays"]);

    const [tab, setTab] = useState(Tab.Upcoming);

    return (
        <Modal {...modalProps} size="lg" title="Birthdays">
            <TabBar
                type="top"
                look="brand"
                className={cl("tab-bar")}
                selectedItem={tab}
                onItemSelect={setTab}
            >
                <TabBar.Item className={cl("tab", { selected: tab === Tab.Upcoming })} id={Tab.Upcoming}>
                    Upcoming
                </TabBar.Item>
                <TabBar.Item className={cl("tab", { selected: tab === Tab.Calendar })} id={Tab.Calendar}>
                    Calendar
                </TabBar.Item>
            </TabBar>

            {tab === Tab.Upcoming ? <UpcomingTab /> : <CalendarTab />}
        </Modal>
    );
}

function EmptyState() {
    return (
        <div className={cl("empty-state")}>
            <Paragraph defaultColor={false}>
                No birthdays saved yet. Right click someone and pick Set Birthday to add one.
            </Paragraph>
        </div>
    );
}

function UpcomingTab() {
    const upcoming = getUpcoming();

    if (upcoming.length === 0) return <EmptyState />;

    return (
        <ScrollerThin className={cl("list")}>
            {upcoming.map(({ userId, birthday, days }) => (
                <UpcomingRow key={userId} userId={userId} birthday={birthday} days={days} />
            ))}
        </ScrollerThin>
    );
}

function UpcomingRow({ userId, birthday, days }: { userId: string; birthday: Birthday; days: number; }) {
    const user = useUser(userId);
    const age = formatUpcomingAge(birthday);

    return (
        <Clickable
            className={cl("row", { today: days === 0 })}
            onClick={() => { openUserProfile(userId).catch(() => void 0); }}
        >
            <Avatar
                src={user?.getAvatarURL(undefined, 40, false)}
                size="SIZE_40"
                className={cl("row-avatar")}
            />

            <div className={cl("row-text")}>
                <Span size="sm" weight="semibold" defaultColor={false} className={cl("row-name")}>
                    {user ? getUniqueUsername(user) : userId}
                </Span>
                <Span size="xs" defaultColor={false} className={cl("row-date")}>
                    {formatBirthday(birthday)}{age == null ? "" : ` · ${age}`}
                </Span>
            </div>

            <Span size="xs" defaultColor={false} className={cl("row-relative")}>
                {days === 0 ? "Today 🎉" : formatRelative(days)}
            </Span>

            <Button
                variant="secondary"
                size="xs"
                className={cl("row-edit")}
                aria-label="Edit birthday"
                onClick={event => {
                    event.stopPropagation();
                    openBirthdayEditModal(userId);
                }}
            >
                Edit
            </Button>
        </Clickable>
    );
}

function buildWeekdays() {
    const firstDayOfWeek = moment.localeData().firstDayOfWeek();
    const names = moment.weekdaysMin();

    const weekdays: string[] = [];
    for (let index = 0; index < 7; index++) {
        weekdays.push(names[(firstDayOfWeek + index) % 7]);
    }

    return weekdays;
}

function buildCells(viewed: Date) {
    const firstDayOfWeek = moment.localeData().firstDayOfWeek();
    const year = viewed.getFullYear();
    const month = viewed.getMonth();

    const leading = (new Date(year, month, 1).getDay() - firstDayOfWeek + 7) % 7;
    const total = new Date(year, month + 1, 0).getDate();

    const cells: Array<Date | null> = [];
    for (let index = 0; index < leading; index++) cells.push(null);
    for (let day = 1; day <= total; day++) cells.push(new Date(year, month, day));

    return cells;
}

function CalendarTab() {
    const [monthOffset, setMonthOffset] = useState(0);

    const today = startOfDay(new Date());
    const viewed = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const weekdays = buildWeekdays();
    const cells = buildCells(viewed);

    return (
        <div>
            <div className={cl("calendar-header")}>
                <Button
                    variant="secondary"
                    size="xs"
                    aria-label="Previous month"
                    onClick={() => setMonthOffset(offset => offset - 1)}
                >
                    {"<"}
                </Button>

                <Span size="md" weight="semibold" defaultColor={false} className={cl("calendar-title")}>
                    {moment(viewed).format("MMMM YYYY")}
                </Span>

                <Button
                    variant="secondary"
                    size="xs"
                    aria-label="Next month"
                    onClick={() => setMonthOffset(offset => offset + 1)}
                >
                    {">"}
                </Button>
            </div>

            <div className={cl("calendar-grid")}>
                {weekdays.map(name => (
                    <BaseText key={name} tag="div" size="xxs" weight="bold" defaultColor={false} className={cl("calendar-weekday")}>{name}</BaseText>
                ))}

                {cells.map((date, index) => date == null
                    ? <div key={`lead-${index}`} className={cl("calendar-cell", "calendar-cell-empty")} />
                    : <CalendarCell key={date.getTime()} date={date} isToday={date.getTime() === today.getTime()} />
                )}
            </div>
        </div>
    );
}

function CalendarCell({ date, isToday }: { date: Date; isToday: boolean; }) {
    const entries = getBirthdaysOn(date);

    return (
        <div className={cl("calendar-cell", { today: isToday, filled: entries.length > 0 })}>
            <Span size="xs" defaultColor={false} className={cl("calendar-day")}>{date.getDate()}</Span>

            <div className={cl("calendar-avatars")}>
                {entries.slice(0, 3).map(({ userId, birthday }) => (
                    <CalendarAvatar key={userId} userId={userId} birthday={birthday} date={date} />
                ))}
                {entries.length > 3 && (
                    <Span size="xxs" defaultColor={false} className={cl("calendar-more")}>+{entries.length - 3}</Span>
                )}
            </div>
        </div>
    );
}

function CalendarAvatar({ userId, birthday, date }: { userId: string; birthday: Birthday; date: Date; }) {
    const user = useUser(userId);
    const name = user ? getUniqueUsername(user) : userId;

    const observed = occurrenceInYear(birthday, date.getFullYear());
    const isMovedDate = observed.getDate() !== birthday.day || observed.getMonth() + 1 !== birthday.month;

    return (
        <Tooltip text={isMovedDate ? `${name} (born ${formatBirthday(birthday)})` : name}>
            {tooltipProps => (
                <Clickable
                    {...tooltipProps}
                    className={cl("calendar-avatar")}
                    aria-label={name}
                    onClick={() => {
                        tooltipProps.onClick?.();
                        openUserProfile(userId).catch(() => void 0);
                    }}
                >
                    <Avatar src={user?.getAvatarURL(undefined, 32, false)} size="SIZE_20" />
                </Clickable>
            )}
        </Tooltip>
    );
}