/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

type Units = "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "months" | "years";

interface Unit {
    value: number;
    unit: string;
}

const units: Record<Units, Unit> = {
    years: { value: 31536000, unit: "year" },
    months: { value: 2592000, unit: "month" },
    days: { value: 86400, unit: "day" },
    hours: { value: 3600, unit: "hour" },
    minutes: { value: 60, unit: "minute" },
    seconds: { value: 1, unit: "second" },
    milliseconds: { value: 0.001, unit: "millisecond" }
};

export function humanizeTime(time: number, unit: Units): string {
    if (time <= 0) {
        return `0 ${unit}`;
    }

    time *= units[unit].value;
    let result = "";
    for (const { value, unit } of Object.values(units).sort(({ value: a }, { value: b }) => b - a)) {
        if (time >= value) {
            const amount = Math.floor(time / value);
            result += `${amount} ${unit}${amount > 1 ? "s" : ""}`;
            time -= amount * value;
            if (time > 0) {
                result += time >= value ? ", " : " and ";
            }
        }
    }
    return result;
}
