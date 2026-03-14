/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type CalculatorResultKind =
    | "number"
    | "time"
    | "duration"
    | "date"
    | "unit";

export type CalculatorViewMode = "result" | "graph";

export interface CalculatorGraphPoint {
    x: number;
    y: number | null;
}

export interface CalculatorGraphSeries {
    id: string;
    label: string;
    color: string;
    points: CalculatorGraphPoint[];
}

export interface CalculatorGraphData {
    defaultViewMode: CalculatorViewMode;
    domain: [number, number];
    range: [number, number];
    series: CalculatorGraphSeries[];
}

export interface CalculatorResult {
    kind: CalculatorResultKind;
    displayInput: string;
    displayAnswer: string;
    rawAnswer: string;
    normalizedInput?: string;
    graph?: CalculatorGraphData;
    secondaryText?: string;
    tertiaryText?: string;
}

export type CalculatorIntent =
    | {
        kind: "advanced_math";
        displayInput: string;
        normalizedInput: string;
    }
    | {
        kind: "math";
        expression: string;
        displayInput: string;
    }
    | {
        kind: "time_convert";
        hour: number;
        minute: number;
        hasMeridiem: boolean;
        meridiem?: "am" | "pm";
        displayInput: string;
    }
    | {
        kind: "time_diff";
        leftHour: number;
        leftMinute: number;
        rightHour: number;
        rightMinute: number;
        displayInput: string;
    }
    | {
        kind: "timezone_convert";
        hour: number;
        minute: number;
        fromTimezone: string;
        toTimezone: string;
        displayInput: string;
    }
    | {
        kind: "timezone_now";
        timezone: string;
        displayInput: string;
    }
    | {
        kind: "days_until";
        targetDate: Date;
        displayInput: string;
    }
    | {
        kind: "days_since";
        targetDate: Date;
        displayInput: string;
    }
    | {
        kind: "weekday_in_weeks";
        weekday: number;
        weeks: number;
        displayInput: string;
    }
    | {
        kind: "unit_convert";
        value: number;
        fromUnit: string;
        toUnit: string;
        displayInput: string;
    }
    | {
        kind: "duration_timespan";
        value: number;
        unit: string;
        displayInput: string;
    }
    | {
        kind: "unsupported_rate";
    };

export type TimezoneAliasMap = Record<string, string>;
