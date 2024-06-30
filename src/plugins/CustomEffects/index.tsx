/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const DB_URL = "https://customeffects.github.io/CustomEffects/src/data.json";

let DB: Record<string, string> = {};

// Download the database

fetch(DB_URL).then(res => res.json()).then(res => {
    DB = res;
});

export default definePlugin({
    name: "CustomEffects",
    description: "Use Custom Profile Effects on your Discord Profile without Nitro!",
    authors: [Devs.HappyEnderman, Devs.SerStars],
    patches: [
        // modify the get profile effect id function so it returns our profile effects
        {
            find: "\"ProfileEffectStore\"",
            replacement: {
                match: /getProfileEffectById\((\i)\){return null!=\i\?(\i)\[\i\]:void 0/,
                replace: "getProfileEffectById($1){return $self.getProfileEffectById($1, $2)"
            }
        },
        {
            // modify the get user profile so it modify's the user profile effect
            find: "\"UserProfileStore\"",
            replacement: {
                match: /getUserProfile\((\w+)\){return (\w+)\[\w+\]}/,
                replace: "getUserProfile($1){ return $self.patchUserProfile($2[$1]) }"
            }
        }
    ],

    getProfileEffectById(skuId, effects) {
        if (skuId.startsWith("ce_")) {
            const effectUrl = DB?.[skuId.replace("ce_", "")];

            if (!effectUrl.startsWith("data:")) {
                fetch(effectUrl)
                    .then(response => response.blob())
                    .then(blob => {
                        const reader = new FileReader();
                        reader.readAsDataURL(blob);
                        reader.onloadend = () => {
                            const dataUrl = reader.result;
                            // @ts-ignore
                            DB[skuId.replace("ce_", "")] = dataUrl;
                        };
                    })
                    .catch(_ => null);
            }
            return {
                "id": skuId,
                "skuId": skuId,
                "config": {
                    "type": 1,
                    "id": "1",
                    "title": "CustomEffect",
                    "description": "Profile effect.",
                    "accessibilityLabel": "Profile effect.",
                    "animationType": 2,
                    "thumbnailPreviewSrc": effectUrl,
                    "reducedMotionSrc": effectUrl,
                    "effects": [
                        {
                            "src": effectUrl,
                            "loop": true,
                            "height": 880,
                            "width": 450,
                            "duration": 2880,
                            "start": 0,
                            "loopDelay": 0,
                            "position": {
                                "x": 0,
                                "y": 0
                            },
                            "zIndex": 100
                        }
                    ],
                    "skuId": skuId
                }
            };
        }
        return skuId != null ? effects[skuId] : void 0;
    },
    patchUserProfile(userProfile) {
        if (!userProfile) return userProfile;
        if (DB?.[userProfile.userId]) {
            userProfile.profileEffectId = `ce_${userProfile.userId}`;
        }
        return userProfile;
    },

    getDatabase() {
        return DB;
    },
    // Try your effect before requesting
    // Open the devtools and paste this code onto the console: Vencord.Plugins.plugins.CustomEffects.tryEffect("your userid","image url")
    tryEffect(user_id, effect_url) {
        DB[user_id] = effect_url;
    },

    settingsAboutComponent: () => {
        return (
            <>
                <Link href="https://github.com/CustomEffects/CustomEffects">
                <b>Click here to get your own effect!</b>
                </Link>
                <br></br>
                <Link href="https://ko-fi.com/happyenderman">
                <b>Support CustomEffects!</b>
                </Link>
            </>
        );
    }

});
