/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Flex } from "@components/Flex";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { Alerts, Button, FluxDispatcher, Forms, Toasts, UserProfileStore, UserStore } from "@webpack/common";
const native = VencordNative.pluginHelpers.Identity as PluginNative<typeof import("./native")>;

const CustomizationSection = findComponentByCodeLazy(".customizationSectionBackground");

async function SetNewData() {
    const PersonData = JSON.parse(await native.RequestRandomUser());
    console.log(PersonData);

    const pfpBase64 = JSON.parse(await native.ToBase64ImageUrl({ imgUrl: PersonData.picture.large })).data;

    // holy moly
    FluxDispatcher.dispatch({ type: "USER_SETTINGS_ACCOUNT_SET_PENDING_AVATAR", avatar: pfpBase64 });
    FluxDispatcher.dispatch({ type: "USER_SETTINGS_ACCOUNT_SET_PENDING_GLOBAL_NAME", globalName: `${PersonData.name.first} ${PersonData.name.last}` });
    FluxDispatcher.dispatch({ type: "USER_SETTINGS_ACCOUNT_SET_PENDING_PRONOUNS", pronouns: `${PersonData.gender === "male" ? "he/him" : PersonData.gender === "female" ? "she/her" : ""}` });
    FluxDispatcher.dispatch({ type: "USER_SETTINGS_ACCOUNT_SET_PENDING_BANNER", banner: null });
    FluxDispatcher.dispatch({ type: "USER_SETTINGS_ACCOUNT_SET_PENDING_ACCENT_COLOR", color: null });
    FluxDispatcher.dispatch({ type: "USER_SETTINGS_ACCOUNT_SET_PENDING_THEME_COLORS", themeColors: [null, null] });
    FluxDispatcher.dispatch({ type: "USER_SETTINGS_ACCOUNT_SET_PENDING_BIO", bio: `Hello! I am ${PersonData.name.first} ${PersonData.name.last}` });
}

async function SaveData() {
    const userData = UserProfileStore.getUserProfile(UserStore.getCurrentUser().id)!;

    // the getUserProfile function doesn't return all the information we need, so we append the standard user object data to the end
    const extraUserObject: any = { extraUserObject: UserStore.getCurrentUser() };

    const pfp = JSON.parse(await native.ToBase64ImageUrl({ imgUrl: `https://cdn.discordapp.com/avatars/${userData.userId}/${extraUserObject.extraUserObject.avatar}.webp?size=4096` })).data;
    const banner = JSON.parse(await native.ToBase64ImageUrl({ imgUrl: `https://cdn.discordapp.com/banners/${userData.userId}/${userData.banner}.webp?size=4096` })).data;

    const fetchedBase64Data =
    {
        pfpBase64: pfp,
        bannerBase64: banner
    };

    DataStore.set("identity-saved-base", JSON.stringify({ ...userData, ...extraUserObject, ...{ fetchedBase64Data: fetchedBase64Data } }));
}

async function LoadData() {
    const userDataMaybeNull = await DataStore.get("identity-saved-base");
    if (!userDataMaybeNull) {
        Toasts.show({ message: "No saved base! Save one first.", id: Toasts.genId(), type: Toasts.Type.FAILURE });
        return;
    }

    const userData = JSON.parse(userDataMaybeNull);

    console.log(userData);

    const { pfpBase64, bannerBase64 } = userData.fetchedBase64Data;

    FluxDispatcher.dispatch({ type: "USER_SETTINGS_ACCOUNT_SET_PENDING_AVATAR", avatar: pfpBase64 });
    FluxDispatcher.dispatch({ type: "USER_SETTINGS_ACCOUNT_SET_PENDING_GLOBAL_NAME", globalName: userData.extraUserObject.globalName });
    FluxDispatcher.dispatch({ type: "USER_SETTINGS_ACCOUNT_SET_PENDING_PRONOUNS", pronouns: userData.pronouns });
    FluxDispatcher.dispatch({ type: "USER_SETTINGS_ACCOUNT_SET_PENDING_BANNER", banner: bannerBase64 });
    FluxDispatcher.dispatch({ type: "USER_SETTINGS_ACCOUNT_SET_PENDING_ACCENT_COLOR", color: userData.accentColor });
    FluxDispatcher.dispatch({ type: "USER_SETTINGS_ACCOUNT_SET_PENDING_THEME_COLORS", themeColors: userData.themeColors });
    FluxDispatcher.dispatch({ type: "USER_SETTINGS_ACCOUNT_SET_PENDING_BIO", bio: userData.bio });
}

function ResetCard() {
    return (
        <CustomizationSection
            title={"Identity"}
            hasBackground={true}
            hideDivider={false}
        >
            <Flex>
                <Button
                    onClick={() => {
                        Alerts.show({
                            title: "Hold on!",
                            body: <div>
                                <Forms.FormText>
                                    Saving your base profile will allow you to have a backup of your actual profile
                                </Forms.FormText>
                                <Forms.FormText>
                                    If you save, it will overwrite your previous data.
                                </Forms.FormText>
                            </div>,
                            confirmText: "Save Anyway",
                            cancelText: "Cancel",
                            onConfirm: SaveData
                        });
                    }}
                    size={Button.Sizes.MEDIUM}
                >
                    Save Base
                </Button>
                <Button
                    onClick={() => {
                        Alerts.show({
                            title: "Hold on!",
                            body: <div>
                                <Forms.FormText>
                                    Loading your base profile will restore your actual profile settings
                                </Forms.FormText>
                                <Forms.FormText>
                                    If you load, it will overwrite your current profile configuration.
                                </Forms.FormText>
                            </div>,
                            confirmText: "Load Anyway",
                            cancelText: "Cancel",
                            onConfirm: LoadData
                        });
                    }}
                    size={Button.Sizes.MEDIUM}
                >
                    Load Base
                </Button>
                <Button
                    onClick={SetNewData}
                    size={Button.Sizes.MEDIUM}
                >
                    Randomise
                </Button>
            </Flex>
        </CustomizationSection>
    );
}

export default definePlugin({
    name: "Identity",
    description: "Allows you to edit your profile to a random fake person with the click of a button",
    authors: [Devs.Samwich, EquicordDevs.port22exposed],
    ResetCard: ResetCard,
    patches: [
        {
            find: "DefaultCustomizationSections",
            replacement: {
                match: /(?<=#{intl::USER_SETTINGS_AVATAR_DECORATION}\)},"decoration"\),)/,
                replace: "$self.ResetCard(),"
            }
        },
    ]
});
