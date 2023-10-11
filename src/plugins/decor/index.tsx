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

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Button, Toasts } from "@webpack/common";

const BASE_URL = "https://decor.fieryflames.dev";
const CDN_URL = "https://decorcdn.fieryflames.dev";
const SKU_ID = "100101099111114"; // decor in ascii numbers

let users: Map<string, string>;
const fetchUsers = async (cache: RequestCache = "default") => users = new Map(Object.entries(await fetch(BASE_URL + "/api/users", { cache }).then(c => c.json())));

let CustomizationSection;

export default definePlugin({
    name: "Decor",
    description: "Custom avatar decorations",
    authors: [Devs.FieryFlames],
    patches: [
        // Patch UserStore to include Decor avatar decorations when getting users
        {
            find: "getUserStoreVersion",
            replacement: {
                match: /(getUser=.+return )(.\[.])/,
                replace: "$1$self.patchGetUser($2)"
            }
        },
        // Patch MediaResolver to return correct URL for Decor avatar decorations
        {
            find: "getAvatarDecorationURL:",
            replacement: {
                match: /avatarDecoration,.+?;/,
                replace: "$&const vcDecorDecoration=$self.patchGetAvatarDecorationURL(arguments[0]);if(vcDecorDecoration)return vcDecorDecoration;"
            }
        },
        // Patch profile customization settings to include Decor section
        {
            find: "DefaultCustomizationSections",
            replacement: {
                match: /{user:(.)},"decoration"\),/,
                replace: "$&$self.DecorSection(),"
            }
        },
        // Obtain CustomizationSection component
        {
            find: "e.titleIcon",
            replacement: {
                match: /function (\i)\(\i\){var \i,\i=\i\.title/,
                replace: "$self.CustomizationSection=$1;$&"
            }
        }

    ],

    set CustomizationSection(e: any) {
        CustomizationSection = e;
    },

    async start() {
        await fetchUsers();
    },

    patchGetUser(user) {
        if (user && users?.has(user.id)) {
            user.avatarDecoration = {
                asset: users.get(user.id),
                skuId: SKU_ID
            };
            user.avatarDecorationData = user.avatarDecoration;
        }
        return user;
    },

    patchGetAvatarDecorationURL({ avatarDecoration, canAnimate }) {
        // Only Decor avatar decorations have this SKU ID
        if (avatarDecoration?.skuId === SKU_ID) {
            const parts = avatarDecoration.asset.split("_");
            if (!canAnimate && parts[0] === "a") parts.shift();
            return CDN_URL + `/${parts.join("_")}.png`;
        }
    },

    DecorSection: ErrorBoundary.wrap(() => {
        return <CustomizationSection
            title="Decor Avatar Decoration"
            hasBackground={true}
        >
            <div style={{ display: "flex" }}>
                <Button
                    onClick={() => {
                        Toasts.show({
                            id: Toasts.genId(),
                            message: "Hello from Decor!",
                            type: Toasts.Type.SUCCESS
                        });
                    }}
                    size={Button.Sizes.SMALL}
                >
                    Change Decor Decoration
                </Button>
                <Button
                    onClick={() => {
                        Toasts.show({
                            id: Toasts.genId(),
                            message: "Goodbye from Decor!",
                            type: Toasts.Type.FAILURE
                        });
                    }}
                    color={Button.Colors.PRIMARY}
                    size={Button.Sizes.SMALL}
                    look={Button.Looks.LINK}
                >
                    Remove Decor Decoration
                </Button>
            </div>
        </CustomizationSection>;
    })
});
