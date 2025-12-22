/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaCalendar, ManaDatePicker, Paragraph, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function CalendarTab() {
    const [calendarValue, setCalendarValue] = useState<any>(null);
    const [datePickerValue, setDatePickerValue] = useState<any>(null);

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Calendar">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Basic calendar component for date selection.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <ManaCalendar
                        value={calendarValue}
                        onChange={setCalendarValue}
                        aria-label="Select a date"
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Calendar (Disabled)">
                <div className="vc-compfinder-grid">
                    <ManaCalendar
                        value={calendarValue}
                        onChange={setCalendarValue}
                        disabled
                        aria-label="Disabled calendar"
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Calendar (Read Only)">
                <div className="vc-compfinder-grid">
                    <ManaCalendar
                        value={calendarValue}
                        onChange={setCalendarValue}
                        readOnly
                        aria-label="Read only calendar"
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Date Picker">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Date picker with input field and calendar popover.
                </Paragraph>
                <div className="vc-compfinder-grid-vertical">
                    <ManaDatePicker
                        value={datePickerValue}
                        onChange={setDatePickerValue}
                        label="Select Date"
                        description="Choose a date from the calendar"
                        granularity="day"
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Date Picker with Time">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Date picker with hour/minute granularity.
                </Paragraph>
                <div className="vc-compfinder-grid-vertical">
                    <ManaDatePicker
                        value={datePickerValue}
                        onChange={setDatePickerValue}
                        label="Select Date & Time"
                        granularity="minute"
                        hourCycle={24}
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Date Picker States">
                <div className="vc-compfinder-grid-vertical">
                    <ManaDatePicker
                        value={datePickerValue}
                        onChange={setDatePickerValue}
                        label="Disabled"
                        disabled
                    />
                    <ManaDatePicker
                        value={datePickerValue}
                        onChange={setDatePickerValue}
                        label="Required"
                        required
                    />
                    <ManaDatePicker
                        value={datePickerValue}
                        onChange={setDatePickerValue}
                        label="With Error"
                        errorMessage="Please select a valid date"
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    <strong>ManaCalendar</strong>
                </Paragraph>
                <Paragraph color="text-muted">
                    • value: any - Selected date value
                </Paragraph>
                <Paragraph color="text-muted">
                    • onChange?: (value: any) =&gt; void - Selection callback
                </Paragraph>
                <Paragraph color="text-muted">
                    • disabled?: boolean - Disable calendar
                </Paragraph>
                <Paragraph color="text-muted">
                    • readOnly?: boolean - Read-only mode
                </Paragraph>
                <Paragraph color="text-muted">
                    • aria-label?: string - Accessibility label
                </Paragraph>
                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>ManaDatePicker</strong>
                </Paragraph>
                <Paragraph color="text-muted">
                    • value: any - Selected date value
                </Paragraph>
                <Paragraph color="text-muted">
                    • onChange?: (value: any) =&gt; void - Selection callback
                </Paragraph>
                <Paragraph color="text-muted">
                    • label?: string - Input label
                </Paragraph>
                <Paragraph color="text-muted">
                    • description?: string - Description text
                </Paragraph>
                <Paragraph color="text-muted">
                    • granularity?: "day" | "hour" | "minute" - Time precision
                </Paragraph>
                <Paragraph color="text-muted">
                    • hourCycle?: 12 | 24 - Hour format
                </Paragraph>
                <Paragraph color="text-muted">
                    • disabled?: boolean - Disable picker
                </Paragraph>
                <Paragraph color="text-muted">
                    • required?: boolean - Mark as required
                </Paragraph>
                <Paragraph color="text-muted">
                    • errorMessage?: string - Error text to display
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
