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
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ApplicationAssetUtils, FluxDispatcher } from "@webpack/common";

async function getAppAsset(key: string): Promise<string> {
    if (/https?:\/\/(cdn|media)\.discordapp\.(com|net)\/attachments\//.test(key)) return "mp:" + key.replace(/https?:\/\/(cdn|media)\.discordapp\.(com|net)\//, "");
    return (await ApplicationAssetUtils.fetchAssetIds(settings.store.client_id!, [key]))[0];
}

function onChange() {
    updateRichPresence();
}

const settings = definePluginSettings({
    client_id: {
        type: OptionType.STRING,
        description: "Discord Client ID",
        isValid: (value: string) => {
            if (!value) return "Client ID is required.";
            if (value && !/^\d+$/.test(value)) return "Client ID must be a number.";
            return true;
        },
        onChange: onChange,
    },
    app_name: {
        type: OptionType.STRING,
        description: "Application name (required)",
        default: "Weather RPC",
        onChange: onChange,
        isValid: (value: string) => {
            if (!value) return "Application name is required.";
            if (value.length > 128) return "Application name must be not longer than 128 characters.";
            return true;
        }
    },
    location: {
        type: OptionType.STRING,
        description: "Location for weather data (e.g., City/Country)",
        default: "New York/US",
        onChange: onChange,
        isValid: (value: string) => {
            if (!value) return "Location name is required.";
            if (value.length > 128) return "Location name must be not longer than 128 characters.";
            return true;
        }
    },
    update_interval: {
        type: OptionType.NUMBER,
        description: "Update interval in seconds",
        default: 15000,
        onChange: onChange,
    },
    imageBig: {
        type: OptionType.STRING,
        description: "Big image key/link",
        onChange: onChange,
        isValid: isImageKeyValid,
        default: "https://i.imgur.com/emqoY01.png"
    }
});

function isImageKeyValid(value: string) {
    if (/https?:\/\/(?!i\.)?imgur\.com\//.test(value)) return "Imgur link must be a direct link to the image. (https://i.imgur.com/...)";
    if (/https?:\/\/(?!media\.)?tenor\.com\//.test(value)) return "Tenor link must be a direct link to the image. (https://media.tenor.com/...)";
    return true;
}

async function fetchWeatherData(location: string) {
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${location}`;
    const geoResponse = await fetch(geocodeUrl, {
        headers: {
            "User-Agent": "WeatherRPC/1.0 (https://vencord.dev/plugins/WeatherRPC)" // Needed or will get blocked
        }
    });

    const geoData = await geoResponse.json();

    const { lat, lon } = geoData[0];

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability&timezone=auto`;
    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();

    return weatherData;
}

async function updateRichPresence() {
    const weatherData = await fetchWeatherData(settings.store.location);
    const temp = weatherData.hourly.temperature_2m[0];
    const rainChance = weatherData.hourly.precipitation_probability[0];

    const activity = {
        application_id: settings.store.client_id,
        name: settings.store.app_name,
        details: `🌡️ Temp: ${temp}°C`,
        state: `🌧️ Rain: ${rainChance}%`,
        type: 0,
        assets: {
            large_image: await getAppAsset(settings.store.imageBig),
            large_text: "Weather Info",
        },
    };

    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity,
        socketId: "WeatherRPC",
    });

    setTimeout(updateRichPresence, settings.store.update_interval * 1000);
}

export default definePlugin({
    name: "WeatherRPC",
    description: "Displays weather in your Discord rich presence.",
    authors: [Devs.k_z],
    dependencies: ["UserSettingsAPI"],
    start: updateRichPresence,
    stop: () => FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity: null, socketId: "WeatherRPC" }),
    settings,
});
