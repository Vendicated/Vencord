import { openModal } from "../../../utils/modal";
import { Settings } from "../../../Vencord";
import { findByProps } from "../../../webpack";
import { FluxDispatcher, React, SelectedChannelStore, Toasts, UserUtils } from "../../../webpack/common";

export async function openUserProfileModal(userId) {
    await UserUtils.fetchUser(userId);
    return FluxDispatcher.dispatch({
        type: "USER_PROFILE_MODAL_OPEN",
        userId,
        channelId: SelectedChannelStore.getChannelId(),
        analyticsLocation: "Explosive Hotel"
    });

}

export function authorize(callback?: any) {
    const settings = Settings.plugins.ReviewDB;
    const { getOAuth2AuthorizeProps } = findByProps("openOAuth2Modal");
    const { OAuth2AuthorizeModal } = findByProps('OAuth2AuthorizeModal');


    var opts = getOAuth2AuthorizeProps("https://discord.com/api/oauth2/authorize?client_id=915703782174752809&redirect_uri=https%3A%2F%2Fmanti.vendicated.dev%2FURauth&response_type=code&scope=identify");

    openModal((props: any) =>
        React.createElement(OAuth2AuthorizeModal, {
            ...props,
            ...opts,
            responseType: 'code',
            cancelCompletesFlow: false,
            callback: (c: any) => {
                try {
                    const url = new URL(c);
                    fetch(url + "&returnType=json&clientMod=vencord").then(res => {
                        res.json().then(res => {
                            if (res.status === 0) {
                                settings.set("token", res.token);
                                showToast("Successfully logged in!");
                                callback?.();
                            } else if (res.status === 1) {
                                showToast("An Error Occured while logging in.");
                            }
                        });
                    });
                } catch (e) {
                    console.log(e);
                }
            }
        })
    );
}

export function showToast(text: string) {
    Toasts.show({
        message: text, options: { position: 1 },
        id: "",
        type: 0
    });
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

