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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByProps } from "@webpack";
import { Text, Button, showToast } from "@webpack/common";

interface Data {
    skuId: string;
    analyticsLocations: string[];
    isGift: boolean;
}

export default definePlugin({
    name: "GiftCollectibles",
    description: "Allow's gifting old collectibles & also fixes payment modal crashing whole app",
    authors: [Devs.HAPPY_ENDERMAN, Devs.SerStars],

    patches: [{
        find: '"Open Collectibles Payment Modal for SKU"',
        replacement: {
            match: /\(0,\i\.jsx\)\(\i\.Button,{onClick:\(\)=>\(0,(\i)\.default\)\({skuId:(\i),analyticsLocations:(\i)}\),children:"Open Collectibles Payment Modal for SKU"}\)/,
            replace: "$&,$self.renderGiftButton($1.default,$2, $3)"
        }
    }],
    flux: {
        // @ts-ignore
        SKU_PURCHASE_PREVIEW_FETCH_FAILURE(event) {
            showToast("Invalid SKU ID! Prevented from crashing...", 2);
            findByProps("closeAllModals").closeAllModals();
        }
    },
    settingsAboutComponent() {
        return (<>
            <Text variant="text-lg/bold">How do I gift old collectibles?</Text>
            <Text variant="text-md/normal">Go to <b>Payment Flow Modals</b> and find <b>COLLECTIBLES PAYMENT MODAL TEST</b> afterwards click on <b>Open Gift Modal for SKU</b></Text>
            <a href="" onClick={(e) => { e.preventDefault(); window.open("https://da.happyenderman.com/collectibles/","_blank") } }>You can find old collectibles skus id here</a>

        </>);
    },
    renderGiftButton(openCollectiblesPaymentModal: ((data: Data) => any), skuId, analyticsLocations: string[]) {
        return (
            <Button onClick={() => openCollectiblesPaymentModal({ skuId, analyticsLocations, isGift: true })} color={Button.Colors.BRAND_NEW} style={{ marginTop: "10px" }}>Open Gift Modal for SKU</Button>
        );
    },

});
