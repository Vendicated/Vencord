/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import "./style.css";

import { addMessageAccessory } from "@api/MessageAccessories";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore } from "@webpack/common";

import { convert } from "./converter";
import { conversions, ConverterAccessory, ConvertIcon } from "./ConverterAccessory";

export const settings = definePluginSettings({
    myUnits: {
        type: OptionType.SELECT,
        description: "the units you use and want things converted to. defaults to imperial",
        options: [
            {
                default: true,
                label: "Imperial",
                value: "imperial",
            },
            {
                label: "Metric",
                value: "metric"
            }
        ]
    },
});

export default definePlugin({
    name: "UnitConverter",
    description: "Converts metric units to Imperal units and vice versa",
    authors: [Devs.sadan],
    messagePopoverButton: {
        icon: ConvertIcon,
        render(message) {
            if (!message.content) return null;
            return {
                label: "Convert Units",
                icon: ConvertIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: async () => {
                    const setConversion = conversions.get(message.id);
                    if (!setConversion) return;
                    setConversion(convert(message.content));
                }
            };
        }
    },
    start() {
        addMessageAccessory("vc-converter", props => <ConverterAccessory message={props.message} />);
    },
    settings,
});
