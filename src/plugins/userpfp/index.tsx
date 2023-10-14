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

// Import additional modules and components
import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { Settings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { LazyComponent } from "@utils/react";
import definePlugin from "@utils/types";
import { findByCode } from "@webpack";
import { Menu, Popout, useState } from "@webpack/common";
import type { ReactNode } from "react";

// Import the CSS file
import "./userpfp.css";

// Define the Vencord plugin
export default definePlugin({
    name: "UserPFP",
    authors: [{ name: "FoxStorm1", id: 789872551731527690n }, { name: "Coolesding", id: 406084422308331522n }],
    description: "Custom animated profile pictures without Discord nitro.",
    settingsAboutComponent: () => {
        return (
            <a href="https://dsc.gg/UserPFP">Request a PFP</a>
        );
    }
});
