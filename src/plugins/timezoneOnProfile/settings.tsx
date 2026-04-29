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

import { definePluginSettings } from "@api/Settings";
import { Paragraph } from "@components/Paragraph";
import { Span } from "@components/Span";
import { OptionType } from "@utils/types";

import { formatTimezoneLabel, setUserTimezone } from "./utils";
import { Button } from "@components/Button";
import { Alerts } from "@webpack/common";

import { DeleteIcon } from "@components/Icons";

function clearAllTimezones() {
    settings.store.timezonesByUser = () => ({});
}

export const settings = definePluginSettings({
    timezonesByUser: {
        type: OptionType.CUSTOM,
        default: () => ({})
    },
    timeFontSize: {
        type: OptionType.NUMBER,
        description: "The font size of the time.",
        default: 14
    },
    messageTimeMode: {
        type: OptionType.SELECT,
        description: "What time to show next to messages",
        options: [
            {
                label: "Sent time in user's timezone next to messages",
                value: "sent",
                default: true
            },
            {
                label: "Current time next to messages",
                value: "current",
            },
            {
                label: "Sent time in DMs, current time in servers",
                value: "dm-sent-server-current"
            },
            {
                label: "Off",
                value: "off"
            }
        ]
    },
    yourTimezone: {
        type: OptionType.COMPONENT,
        component() {
            const localTimezone = Intl?.DateTimeFormat?.()?.resolvedOptions?.().timeZone ?? "N/A";
            const display = localTimezone === "N/A" ? "N/A" : formatTimezoneLabel(localTimezone);

            return (
                <div className="vc-plugins-setting-label">
                    <Paragraph size="md" weight="medium">Your Timezone</Paragraph>
                    <Paragraph>Your current timezone is: <Span weight="bold">{display}</Span></Paragraph>
                </div>
            );
        }
    },
    clearSavedTimezones: {
        type: OptionType.COMPONENT,
        component() {
            const timezones = settings.store.timezonesByUser as unknown as Record<string, string>;
            const count = Object.keys(timezones).length;

            return (
                <Button
                    variant="dangerPrimary"
                    disabled={count === 0}
                    className="vc-tzonprofile-icon-with-button"
                    onClick={() => Alerts.show({
                        title: "Are you sure?",
                        body: "This removes timezone data for all users, once erased it cannot be recovered.",
                        onConfirm: clearAllTimezones,
                        confirmText: "Erase it!",
                        confirmColor: "vc-tzonprofile-erase-danger-btn",
                        cancelText: "Nevermind"
                    })}
                >
                    <DeleteIcon className="vc-tzonprofile-button-icon" />
                    Clear Saved Timezones
                </Button >
            );
        }
    },
});
