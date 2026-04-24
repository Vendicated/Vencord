/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaCalendar, ManaDatePicker } from "@equicordplugins/components.dev";

import { useState } from "..";
import { DocPage, type PropDef } from "../DocPage";

const CALENDAR_PROPS: PropDef[] = [
    { name: "value", type: "CalendarDate | null", description: "The currently selected date value." },
    { name: "onChange", type: "(value: CalendarDate) => void", description: "Called when a date is selected." },
    { name: "minValue", type: "CalendarDate", description: "Minimum selectable date." },
    { name: "maxValue", type: "CalendarDate", description: "Maximum selectable date." },
    { name: "disabled", type: "boolean", default: "false", description: "Disables the entire calendar." },
    { name: "readOnly", type: "boolean", default: "false", description: "Makes the calendar read-only. Dates are visible but not selectable." },
    { name: "className", type: "string", description: "Additional CSS class on the root element." },
    { name: "aria-label", type: "string", description: "Accessibility label for the calendar." },
];

const DATEPICKER_PROPS: PropDef[] = [
    { name: "value", type: "CalendarDate | CalendarDateTime | null", description: "The currently selected date/time value." },
    { name: "onChange", type: "(value: CalendarDate | CalendarDateTime) => void", description: "Called when the value changes. Also closes the popover." },
    { name: "minValue", type: "CalendarDate", description: "Minimum selectable date." },
    { name: "maxValue", type: "CalendarDate", description: "Maximum selectable date." },
    { name: "placeholderValue", type: "CalendarDate | CalendarDateTime", description: "Placeholder date shown in the input when no value is selected." },
    { name: "granularity", type: '"day" | "hour" | "minute" | "second"', default: '"day"', description: "Time precision level. Day shows only date fields, others add time segments." },
    { name: "hourCycle", type: "12 | 24", description: "Whether to use 12-hour or 24-hour time format." },
    { name: "hideTimeZone", type: "boolean", default: "false", description: "Hides the time zone display when using time granularity." },
    { name: "label", type: "string", description: "Input field label." },
    { name: "hideLabel", type: "boolean", description: "Visually hides the label while keeping it accessible." },
    { name: "description", type: "string", description: "Help text shown below the label." },
    { name: "helperText", type: "string", description: "Additional help text shown below the input." },
    { name: "errorMessage", type: "string", description: "Error text shown below the input. Triggers error styling when non-empty." },
    { name: "successMessage", type: "string", description: "Success text shown below the input." },
    { name: "disabled", type: "boolean", description: "Disables the date picker input and calendar." },
    { name: "required", type: "boolean", default: "false", description: "Marks the field as required." },
    { name: "badge", type: "ReactNode", description: "Badge element displayed next to the label." },
    { name: "icon", type: "ReactNode", description: "Icon displayed in the field." },
    { name: "id", type: "string", description: "Custom ID for the input control." },
    { name: "layout", type: "string", description: "Field layout variant." },
    { name: "layoutConfig", type: "Record<string, unknown>", description: "Configuration for the field layout." },
];

function CalendarDemo() {
    const [value, setValue] = useState<any>(null);

    return (
        <ManaCalendar
            value={value}
            onChange={setValue}
            aria-label="Select a date"
        />
    );
}

function DatePickerDemo() {
    const [value, setValue] = useState<any>(null);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 300 }}>
            <ManaDatePicker
                value={value}
                onChange={setValue}
                label="Select Date"
                description="Choose a date from the calendar"
                granularity="day"
            />
        </div>
    );
}

function DatePickerTimeDemo() {
    const [value, setValue] = useState<any>(null);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 300 }}>
            <ManaDatePicker
                value={value}
                onChange={setValue}
                label="Select Date & Time"
                granularity="minute"
                hourCycle={24}
            />
        </div>
    );
}

function DatePickerStatesDemo() {
    const [value, setValue] = useState<any>(null);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 300 }}>
            <ManaDatePicker
                value={value}
                onChange={setValue}
                label="Disabled"
                disabled
            />
            <ManaDatePicker
                value={value}
                onChange={setValue}
                label="Required"
                required
            />
            <ManaDatePicker
                value={value}
                onChange={setValue}
                label="With Error"
                errorMessage="Please select a valid date"
            />
            <ManaDatePicker
                value={value}
                onChange={setValue}
                label="With Helper Text"
                helperText="Pick any date in the future"
            />
        </div>
    );
}

export default function CalendarTab() {
    return (
        <DocPage
            componentName="Calendar"
            overview="ManaCalendar is a standalone calendar grid for date selection. ManaDatePicker wraps it in a text input with a popover, supporting time granularity, validation states, and field layout props. Both use react-aria internationalized date objects internally."
            notices={[
                { type: "info", children: "Calendar values use react-aria's CalendarDate and CalendarDateTime types from @internationalized/date, not native JavaScript Date objects. You may need to convert between them." },
            ]}
            importPath={'import { ManaCalendar, ManaDatePicker } from "../components";'}
            sections={[
                {
                    title: "Calendar",
                    description: "Basic calendar grid. Click a date to select it. Navigate months with the arrow buttons.",
                    code: '<ManaCalendar value={date} onChange={setDate} aria-label="Pick a date" />',
                    relevantProps: ["value", "onChange", "aria-label"],
                    children: <CalendarDemo />
                },
                {
                    title: "Calendar (Disabled)",
                    description: "All dates are visible but not interactive.",
                    relevantProps: ["disabled"],
                    children: (
                        <ManaCalendar
                            value={null}
                            onChange={() => { }}
                            disabled
                            aria-label="Disabled calendar"
                        />
                    )
                },
                {
                    title: "Calendar (Read Only)",
                    description: "Dates are visible with current selection shown but cannot be changed.",
                    relevantProps: ["readOnly"],
                    children: (
                        <ManaCalendar
                            value={null}
                            onChange={() => { }}
                            readOnly
                            aria-label="Read only calendar"
                        />
                    )
                },
                {
                    title: "Date Picker",
                    description: "Text input with a calendar popover. Click the calendar icon to open.",
                    code: '<ManaDatePicker\n  value={date}\n  onChange={setDate}\n  label="Event Date"\n  description="When should this happen?"\n  granularity="day"\n/>',
                    relevantProps: ["label", "description", "granularity"],
                    children: <DatePickerDemo />
                },
                {
                    title: "Date Picker with Time",
                    description: "Using minute granularity adds hour and minute segments to the input.",
                    code: '<ManaDatePicker\n  value={date}\n  onChange={setDate}\n  label="Start Time"\n  granularity="minute"\n  hourCycle={24}\n  required\n  errorMessage={!date ? "Required" : ""}\n/>',
                    relevantProps: ["granularity", "hourCycle"],
                    children: <DatePickerTimeDemo />
                },
                {
                    title: "Date Picker States",
                    description: "Disabled, required, error, and helper text states.",
                    relevantProps: ["disabled", "required", "errorMessage", "helperText"],
                    children: <DatePickerStatesDemo />
                },
            ]}
            props={[
                ...CALENDAR_PROPS.map(p => ({ ...p, name: `[Calendar] ${p.name}` })),
                ...DATEPICKER_PROPS.map(p => ({ ...p, name: `[DatePicker] ${p.name}` })),
            ]}
        />
    );
}
