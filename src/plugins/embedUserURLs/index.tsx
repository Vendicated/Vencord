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

import { addAccessory, removeAccessory } from "@api/MessageAccessories";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import UserURLEmbed from "./components";

export default definePlugin({
    name: "EmbedUserURLs",
    description: "Embeds user URLs in messages.",
    authors: [Devs.castdrian],
    dependencies: ["MessageAccessoriesAPI"],

    async start() {
        addAccessory("user-url-embed", props => (
            <ErrorBoundary noop>
                <UserURLEmbed message={props.message} />
            </ErrorBoundary>
        ));
    },

    stop() {
        removeAccessory("user-url-embed");
    },
});
