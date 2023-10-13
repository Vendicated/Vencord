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
import { Button } from "@webpack/common";

import { getUsers, users } from "./lib/api";
import { CDN_URL, RAW_SKU_ID, SKU_ID } from "./lib/constants";
import { useAuthorizationStore } from "./lib/stores/AuthorizationStore";
import { useUserDecorationsStore } from "./lib/stores/UserDecorationsStore";
import { setOpenCreateStickerModalLazy } from "./lib/utils/requireCreateStickerModal";
import { setAvatarDecorationPreview, setDecorationGridDecoration, setDecorationGridItem } from "./ui/components";
import { openChangeDecorationModal } from "./ui/modals/ChangeDecorationModal";

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
        },
        // Decoration modal module
        {
            find: ".decorationGridItem",
            replacement: [{
                match: /(?:,)((\i)=function\(.\){var \i=\i\.children)/,
                replace: ";var $2;$self.DecorationGridItem=$1"
            },
            {
                match: /const (\i)=(function\(\i\){var \i=\i\.user,\i=\i\.avatarDecorationOverride,\i=\i\.className)/,
                replace: "let $1;$1=$self.AvatarDecorationPreview=$2"
            },
            {
                match: /,(\i)=(function\(\i\){var \i=\i\.user,\i=\i\.avatarDecoration,)/,
                replace: ";var $1;$self.DecorationGridDecoration=$1=$2"
            },
            {
                match: /\i\.\i\.isItemViewed\((\i)\)/,
                replace: "$1.skuId !== $self.SKU_ID ? $& : true"
            },
            {
                match: /((\i)\.label}\),)(\i===\i\.PURCHASE\|\|\i===\i\.PREMIUM_PURCHASE&&\i)/,
                replace: "$1t.skuId === $self.SKU_ID || ($3)"
            }]
        },
        {
            find: "GUILD_STICKER_SETTINGS_REMAINING_SLOTS_AVAILABLE.format",
            replacement: {
                match: /(numTotal:.+?,)(\i)=(function\(\i\){var \i=\i\.guildId)/,
                replace: "$1$2=$self.openCreateStickerModalLazy=$3"
            }
        }
    ],

    flux: {
        CONNECTION_OPEN: () => {
            useAuthorizationStore.getState().init();
            useUserDecorationsStore.getState().clear();
        }
    },

    set CustomizationSection(e: any) {
        CustomizationSection = e;
    },

    set AvatarDecorationPreview(e: any) {
        setAvatarDecorationPreview(e);
    },

    set DecorationGridItem(e: any) {
        setDecorationGridItem(e);
    },

    set DecorationGridDecoration(e: any) {
        setDecorationGridDecoration(e);
    },

    set openCreateStickerModalLazy(e: any) {
        setOpenCreateStickerModalLazy(e);
    },

    SKU_ID,

    async start() {
        await getUsers();
    },

    patchGetUser(user) {
        if (user && users?.has(user.id) && user.avatarDecoration?.skuId !== SKU_ID) {
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
        console.log(avatarDecoration?.asset);
        if (avatarDecoration?.skuId === SKU_ID) {
            const parts = avatarDecoration.asset.split("_");
            if (!canAnimate && parts[0] === "a") parts.shift();
            return CDN_URL + `/${parts.join("_")}.png`;
        } else if (avatarDecoration?.skuId === RAW_SKU_ID) {
            return avatarDecoration.asset;
        }
    },

    DecorSection: ErrorBoundary.wrap(() => {
        const authorization = useAuthorizationStore();
        const { selectedDecoration, select: selectDecoration } = useUserDecorationsStore();

        // TODO: Change title to just "Decor" when profile effects are implemented
        return <CustomizationSection
            title="Decor Avatar Decoration"
            hasBackground={true}
        >
            <div style={{ display: "flex" }}>
                {authorization.isAuthorized() ? <>
                    <Button
                        onClick={openChangeDecorationModal}
                        size={Button.Sizes.SMALL}
                    >
                        Change Decor Decoration
                    </Button>
                    {selectedDecoration && <Button
                        onClick={() => selectDecoration(null)}
                        color={Button.Colors.PRIMARY}
                        size={Button.Sizes.SMALL}
                        look={Button.Looks.LINK}
                    >
                        Remove Decor Decoration
                    </Button>}
                </> :
                    <Button
                        onClick={authorization.authorize}
                        size={Button.Sizes.SMALL}
                    >
                        Authorize
                    </Button>
                }
            </div>
        </CustomizationSection >;
    })
});
