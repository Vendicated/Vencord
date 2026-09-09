/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Heading } from "@components/Heading";
import { Span } from "@components/Span";
import { daysInMonth, getBirthday, isValidBirthday, removeBirthday, setBirthday } from "@plugins/birthdays/data";
import { cl } from "@plugins/birthdays/utils";
import { getUniqueUsername } from "@utils/discord";
import type { RenderModalProps } from "@vencord/discord-types";
import { Avatar, Modal, moment, openModal, Select, showToast, TextInput, Toasts, useState } from "@webpack/common";

import { useUser } from "./hooks";

interface Props {
    userId: string;
    modalProps: RenderModalProps;
}

export function openBirthdayEditModal(userId: string) {
    openModal(modalProps => (
        <ErrorBoundary>
            <BirthdayEditModal userId={userId} modalProps={modalProps} />
        </ErrorBoundary>
    ));
}

function BirthdayEditModal({ userId, modalProps }: Props) {
    const user = useUser(userId);
    const existing = getBirthday(userId);
 
    const [month, setMonth] = useState<number | undefined>(existing?.month);
    const [day, setDay] = useState<number | undefined>(existing?.day);
    const [year, setYear] = useState(existing?.year == null ? "" : String(existing.year));

    const monthOptions = moment.months().map((label, index) => ({ label, value: index + 1 }));

    const parsedYear = year.trim() === "" ? undefined : Number(year.trim());
    const maxDay = month == null ? 31 : daysInMonth(month, parsedYear);

    const dayOptions: Array<{ label: string; value: number; }> = [];
    for (let day = 1; day <= maxDay; day++) {
        dayOptions.push({ label: String(day), value: day });
    }

    const dayOutOfRange = month != null && day != null && day > daysInMonth(month, parsedYear);
 
    const yearError = year.trim() !== "" && !(
        /^\d{4}$/.test(year.trim())
        && parsedYear! >= 1900
        && parsedYear! <= new Date().getFullYear()
    )
        ? "Enter a four digit year, or leave this empty"
        : dayOutOfRange
            ? `${day} ${moment.months()[month! - 1]} does not exist in ${parsedYear}`
            : undefined;

    const candidate = { day: day!, month: month!, year: parsedYear };
    const canSave = yearError == null && isValidBirthday(candidate);

    function save() {
        if (!canSave) return;

        setBirthday(userId, candidate);
        showToast("Birthday saved", Toasts.Type.SUCCESS);
        modalProps.onClose();
    }
 
    function remove() {
        removeBirthday(userId);
        showToast("Birthday removed", Toasts.Type.SUCCESS); 
        modalProps.onClose();
    }

    const actions = [
        {
            text: "Save",
            variant: "primary",
            disabled: !canSave,
            onClick: save
        }
    ];

    if (existing != null) {
        actions.unshift({
            text: "Remove",
            variant: "critical-primary",
            disabled: false,
            onClick: remove
        });
    }

    return (
        <Modal
            {...modalProps}
            size="sm"
            title={
                <div className={cl("edit-header")}>
                    {user && <Avatar src={user.getAvatarURL(undefined, 40, false)} size="SIZE_40" />}
                    <Span size="md" weight="semibold">{user ? getUniqueUsername(user) : "Unknown user"}</Span>
                </div>
            }
            actions={actions}
        >
            <form
                className={cl("edit-form")}
                onSubmit={event => {
                    event.preventDefault(); 
                    save();
                }}
            >
                <div className={cl("edit-row")}>
                    <div className={cl("edit-field")}>
                        <Heading tag="h5">Month</Heading>
                        <Select
                            placeholder="Select a month"
                            options={monthOptions}
                            isSelected={value => value === month}
                            select={value => {
                                setMonth(value);
                                if (day != null && day > daysInMonth(value, parsedYear)) setDay(undefined);
                            }}
                            serialize={String}
                            closeOnSelect
                        />
                    </div>

                    <div className={cl("edit-field")}>
                        <Heading tag="h5">Day</Heading>
                        <Select
                            placeholder="Select a day"
                            options={dayOptions}
                            isSelected={value => value === day}
                            select={setDay}
                            serialize={String}
                            isDisabled={month == null}
                            closeOnSelect
                        />
                    </div>
                </div>

                <div className={cl("edit-field")}>
                    <Heading tag="h5">Year (optional)</Heading>
                    <TextInput
                        value={year}
                        onChange={setYear}
                        placeholder="e.g. 2001"
                        maxLength={4}
                        error={yearError}
                    />
                </div>
            </form>
        </Modal>
    );
}
