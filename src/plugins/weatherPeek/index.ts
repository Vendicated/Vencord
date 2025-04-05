/*
 * Vencord Plugin: WeatherPeek
 * Description: Pops up a weather overlay in Discord UI when a hotkey is pressed.
 * Author: BX / Tiso99
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

import definePlugin from "@utils/types";
import { useSetting } from "@api/settings";
import { findByPropsLazy, React } from "@webpack";
import { showToast } from "@api/toasts";
import { Devs } from "@utils/constants";

const defaultLocation = "New York";
const defaultKeybind = "Ctrl+W";

async function fetchWeather(location) {
    const url = `https://wttr.in/${encodeURIComponent(location)}?format=%C+%t+%w+%h+%p+%l+%L`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Weather API failed");
        return await res.text();
    } catch (err) {
        console.error("[WeatherPeek] Error fetching weather:", err);
        return null;
    }
}

function WeatherOverlay({ weather, onClose }) {
    const { Text, Heading, Button, Icon } = findByPropsLazy("Text", "Heading", "Button", "Icon") ?? {};

    const weatherIcons = {
        "Partly cloudy": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Partly_cloudy_icon.svg/120px-Partly_cloudy_icon.svg.png",
        "Clear": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Sun_icon_%28SVG%29.svg/120px-Sun_icon_%28SVG%29.svg.png",
        "Rain": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Cloud_rain_icon.svg/120px-Cloud_rain_icon.svg.png",
        "Snow": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Snowflake_icon.svg/120px-Snowflake_icon.svg.png",
        "Thunderstorm": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Thunderstorm_icon.svg/120px-Thunderstorm_icon.svg.png"
    };

    const weatherText = weather.split("+");
    const condition = weatherText[0].trim();
    const temp = weatherText[1].trim();
    const wind = weatherText[2].trim();
    const humidity = weatherText[3].trim();
    const pressure = weatherText[4].trim();
    const location = weatherText[5].trim();

    return (
        <div style={{
            position: "fixed",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--background-secondary)",
            padding: "20px",
            borderRadius: "12px",
            zIndex: 9999,
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            width: "300px",
            textAlign: "center",
            color: "var(--text-normal)"
        }}>
            <Heading variant="heading-md/semibold">{location}</Heading>
            <img src={weatherIcons[condition] || weatherIcons["Clear"]} alt="Weather Icon" style={{ width: "50px", height: "50px" }} />
            <Text size={16}>{temp}</Text>
            <Text size={12}>{condition}</Text>
            <Text size={12}>Wind: {wind}</Text>
            <Text size={12}>Humidity: {humidity}</Text>
            <Text size={10}>Pressure: {pressure}</Text>
            <br />
            <Button onClick={onClose} style={{ marginTop: "10px" }}>Close</Button>
        </div>
    );
}

export default definePlugin({
    name: "WeatherPeek",
    description: "Shows a quick popup with weather information via a hotkey.",
    authors: [Devs.BX],

    settings: [
        {
            type: "textbox",
            name: "Location",
            note: "Enter your city or zip.",
            default: defaultLocation,
            id: "weatherLocation"
        },
        {
            type: "textbox",
            name: "Hotkey",
            note: "Key combo to show weather (e.g. Ctrl+W).",
            default: defaultKeybind,
            id: "weatherHotkey"
        }
    ],

    onLoad() {
        this.handleKey = this.handleKey.bind(this);
        document.addEventListener("keydown", this.handleKey);
    },

    onUnload() {
        document.removeEventListener("keydown", this.handleKey);
    },

    async handleKey(event) {
        const location = this.getSetting("weatherLocation", defaultLocation);
        const combo = this.getSetting("weatherHotkey", defaultKeybind).toLowerCase();
        const pressed = [];
        if (event.ctrlKey) pressed.push("ctrl");
        if (event.shiftKey) pressed.push("shift");
        if (event.altKey) pressed.push("alt");
        if (!["control", "shift", "alt"].includes(event.key.toLowerCase())) pressed.push(event.key.toLowerCase());

        const userCombo = pressed.join("+");
        if (userCombo !== combo) return;

        const weather = await fetchWeather(location);
        if (!weather) return showToast("Failed to get weather data.", { type: "error" });

        this.renderWeather(weather);
    },

    renderWeather(weather) {
        const container = document.createElement("div");
        document.body.appendChild(container);

        const close = () => {
            React.unmountComponentAtNode(container);
            container.remove();
        };

        React.render(
            React.createElement(WeatherOverlay, { weather, onClose: close }),
            container
        );
    }
});
