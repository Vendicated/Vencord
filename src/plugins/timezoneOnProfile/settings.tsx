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

import { formatTimezoneLabel } from "./utils";

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
    showCurrentTimeOnMessages: {
        type: OptionType.BOOLEAN,
        description: "Show current time next to messages",
        default: false
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
    }
});
