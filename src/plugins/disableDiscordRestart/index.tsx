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

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Devs } from "@utils/constants";

import './styles.css';

const settings = definePluginSettings({
    showAlert: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show alert when Ctrl + R is disabled",
        restartNeeded: true,
    },
});

const disableRestartShortcut = (event) => {
    if (event.ctrlKey && event.key === 'r') {
        event.preventDefault();
        event.stopPropagation();
        console.log("Ctrl + R shortcut disabled");
        if (settings.store.showAlert) {
            showAlertPopup("Ctrl + R shortcut disabled", "DisableDiscordRestart - Made by Burlone");
        }
    }
};

const showAlertPopup = (message, title) => {
    const modal = document.createElement('div');
    modal.classList.add('discord-popup');

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.classList.add('discord-popup-close');
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messageElement.classList.add('discord-popup-message');

    const titleElement = document.createElement('h2');
    titleElement.textContent = title;
    titleElement.classList.add('discord-popup-title');

    modal.appendChild(closeButton);
    modal.appendChild(titleElement);
    modal.appendChild(messageElement);

    document.body.appendChild(modal);
};

const startPlugin = () => {
    document.addEventListener('keydown', disableRestartShortcut);
};

const stopPlugin = () => {
    document.removeEventListener('keydown', disableRestartShortcut);
};

export default definePlugin({
    name: "DisableDiscordRestart",
    authors: [Devs.Burlone],
    description: "Disables the Ctrl + R shortcut to prevent Discord from restarting.",
    dependencies: [],
    start: startPlugin,
    stop: stopPlugin,
    settings
});