/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { RunningGameStore } from "@webpack/common";

let savedStatus: string | null;
let checkInterval: NodeJS.Timeout | null = null;

const statusName: string = "dnd";

const StatusSettings = getUserSettingLazy<string>("status", "status")!;

const settings = definePluginSettings({
    refreshTime: {
        type: OptionType.NUMBER,
        description: "How often it checks for a runnin game (s)",
        default: 30
    },
    enableTimeBased: {
        type: OptionType.BOOLEAN,
        description: "Set status to DND during specific times"
    },
    startTime: {
        type: OptionType.STRING,
        description: "The time to start using DND"
    },
    endTime: {
        type: OptionType.STRING,
        description: "The time to start using DND"
    },
    useEuropeanDateFormat: {
        type: OptionType.BOOLEAN,
        description: "Use European date format (DD/MM/YY) instead of American (MM/DD/YY)",
        default: false
    },
    enableWeekdays: {
        type: OptionType.BOOLEAN,
        description: "Have DND Enabled on weekdays"
    },
    enableWeekends: {
        type: OptionType.BOOLEAN,
        description: "Have DND Enabled on weekends"
    },
    onGame: {
        type: OptionType.BOOLEAN,
        description: "Have DND Enabled when playing specific games"
    },
    gameList: {
        type: OptionType.STRING,
        description: "Comma-separated list of game names (e.g., 'League of Legends, Valorant, Minecraft')",
        default: "",
        disabled: () => !settings.store.onGame
    }
});

/**
 * Parses a time string and returns hours and minutes in 24-hour format
 * Supports formats: 1900, 19:00, 7:00pm, 7:00am, 0700
 */
function parseTime(timeStr: string): { hours: number; minutes: number; } | null {
    if (!timeStr) return null;

    const trimmed = timeStr.trim().toLowerCase();

    // Check for am/pm format: 7:00pm, 7:00am, 7pm, 7am
    const ampmMatch = trimmed.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)$/);
    if (ampmMatch) {
        let hours = parseInt(ampmMatch[1]);
        const minutes = parseInt(ampmMatch[2] || "0");
        const meridiem = ampmMatch[3];

        // Convert to 24-hour format
        if (meridiem === "pm" && hours !== 12) hours += 12;
        if (meridiem === "am" && hours === 12) hours = 0;

        if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
            return { hours, minutes };
        }
    }

    // Check for colon format: 19:00, 7:30
    const colonMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (colonMatch) {
        const hours = parseInt(colonMatch[1]);
        const minutes = parseInt(colonMatch[2]);

        if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
            return { hours, minutes };
        }
    }

    // Check for military time without colon: 1900, 0700, 0000
    const militaryMatch = trimmed.match(/^(\d{2})(\d{2})$/);
    if (militaryMatch) {
        const hours = parseInt(militaryMatch[1]);
        const minutes = parseInt(militaryMatch[2]);

        if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
            return { hours, minutes };
        }
    }

    return null;
}

/**
 * Parses a date string based on the configured date format
 * Supports: dd/mm/yy, dd/mm/yyyy, mm/dd/yy, mm/dd/yyyy (and with dashes)
 */
function parseDate(dateStr: string, useEuropeanFormat: boolean): { year: number; month: number; day: number; } | null {
    if (!dateStr) return null;

    const trimmed = dateStr.trim();

    // Match date patterns with / or - separators
    const dateMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (!dateMatch) return null;

    const part1 = parseInt(dateMatch[1]);
    const part2 = parseInt(dateMatch[2]);
    let year = parseInt(dateMatch[3]);

    // Convert 2-digit year to 4-digit year
    if (year < 100) {
        year += year < 50 ? 2000 : 1900;
    }

    let day: number, month: number;

    if (useEuropeanFormat) {
        // DD/MM/YYYY
        day = part1;
        month = part2;
    } else {
        // MM/DD/YYYY (American)
        month = part1;
        day = part2;
    }

    // Validate date components
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
        return null;
    }

    return { year, month: month - 1, day }; // month is 0-indexed for Date constructor
}

/**
 * Converts a datetime string to a Date object
 * Supports various formats:
 * - Time only: 1900, 19:00, 7:00pm, 7:00am, 0700
 * - Date only: dd/mm/yy, dd/mm/yyyy (format depends on setting)
 * - Date + Time: dd/mm/yy 19:00, dd/mm/yyyy 7:00pm, etc.
 */
function convertTimeString(input: string): Date | null {
    if (!input) return null;

    const trimmed = input.trim();
    const useEuropeanFormat = settings.store.useEuropeanDateFormat;

    // Try to split into date and time parts
    const parts = trimmed.split(/\s+/);

    if (parts.length === 1) {
        // Single part - could be just time or just date
        const timeResult = parseTime(parts[0]);
        if (timeResult) {
            // Just time - use today's date
            const now = new Date();
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), timeResult.hours, timeResult.minutes, 0, 0);
        }

        const dateResult = parseDate(parts[0], useEuropeanFormat);
        if (dateResult) {
            // Just date - use midnight
            return new Date(dateResult.year, dateResult.month, dateResult.day, 0, 0, 0, 0);
        }

        return null;
    } else if (parts.length === 2) {
        // Two parts - assume first is date, second is time
        const dateResult = parseDate(parts[0], useEuropeanFormat);
        const timeResult = parseTime(parts[1]);

        if (dateResult && timeResult) {
            return new Date(dateResult.year, dateResult.month, dateResult.day, timeResult.hours, timeResult.minutes, 0, 0);
        }

        return null;
    }

    return null;
}

function shouldBeInDND(): boolean {
    // Check if currently playing a tracked game
    if (settings.store.onGame) {
        const gameList = settings.store.gameList
            .split(",")
            .map(game => game.trim().toLowerCase())
            .filter(game => game.length > 0);

        const runningGames = RunningGameStore.getRunningGames();
        const isPlayingTrackedGame = runningGames.some(game =>
            gameList.includes(game.name.toLowerCase())
        );

        if (isPlayingTrackedGame) return true;
    }

    if (settings.store.enableTimeBased) {
        const { startTime, endTime } = settings.store;

        // Check if current time is within the DND time range
        if (startTime && endTime) {
            const startTimeDate = convertTimeString(startTime);
            const endTimeDate = convertTimeString(endTime);

            if (startTimeDate && endTimeDate) {
                const now = new Date();

                // Check if the time range spans midnight (e.g., 23:00 to 01:00)
                if (startTimeDate > endTimeDate) {
                    // Range spans midnight - check if current time is after start OR before end
                    if (now >= startTimeDate || now <= endTimeDate) {
                        return true;
                    }
                } else {
                    // Normal range - check if current time is between start and end
                    if (now >= startTimeDate && now <= endTimeDate) {
                        return true;
                    }
                }
            }
        }
    }

    // Checks if currently on a weekday
    const dayOfWeek = new Date().getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (settings.store.enableWeekdays && isWeekday) {
        return true;
    }
    if (settings.store.enableWeekends && isWeekend) {
        return true;
    }

    return false;
}

function checkAndUpdateStatus() {
    const currentStatus = StatusSettings.getSetting();
    const shouldBeDND = shouldBeInDND();

    if (shouldBeDND) {
        // Should be in DND - set it if not already
        if (currentStatus !== statusName) {
            savedStatus = currentStatus;
            StatusSettings.updateSetting(statusName);
        }
    } else if (savedStatus && savedStatus !== statusName) {
        // Should not be in DND - restore previous status
        StatusSettings.updateSetting(savedStatus);
        savedStatus = null;
    }
}

export default definePlugin({
    name: "SmartDoNotDisturb",
    description: "Automatically updates your online status to dnd based on your own conditions",
    authors: [Devs.Capzay],
    settings,

    start() {
        // Check status every X seconds
        checkInterval = setInterval(checkAndUpdateStatus, settings.store.refreshTime * 1000);
        // Also check immediately on start
        checkAndUpdateStatus();
    },

    stop() {
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }
        if (savedStatus) {
            StatusSettings.updateSetting(savedStatus);
            savedStatus = null;
        }
    }
});
