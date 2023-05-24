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

import { Settings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Logger } from "@utils/Logger";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import { useForceUpdater } from "@utils/react";
import { findByProps } from "@webpack";
import { FluxDispatcher, React, SelectedChannelStore, Text, Toasts, UserStore, UserUtils, useState } from "@webpack/common";

import ReviewsView, { ReviewsInputComponent } from "../components/ReviewsView";
import { Review } from "../entities/Review";
import { UserType } from "../entities/User";

export const REVIEWS_PER_PAGE = 50;

export async function openUserProfileModal(userId: string) {
    await UserUtils.fetchUser(userId);

    await FluxDispatcher.dispatch({
        type: "USER_PROFILE_MODAL_OPEN",
        userId,
        channelId: SelectedChannelStore.getChannelId(),
        analyticsLocation: "Explosive Hotel"
    });
}

export function authorize(callback?: any) {
    const { OAuth2AuthorizeModal } = findByProps("OAuth2AuthorizeModal");

    openModal((props: any) =>
        <OAuth2AuthorizeModal
            {...props}
            scopes={["identify"]}
            responseType="code"
            redirectUri="https://manti.vendicated.dev/api/reviewdb/auth"
            permissions={0n}
            clientId="915703782174752809"
            cancelCompletesFlow={false}
            callback={async (u: string) => {
                try {
                    const url = new URL(u);
                    url.searchParams.append("clientMod", "vencord");
                    const res = await fetch(url, {
                        headers: new Headers({ Accept: "application/json" })
                    });
                    const { token, success } = await res.json();
                    if (success) {
                        Settings.plugins.ReviewDB.token = token;
                        showToast("Successfully logged in!");
                        callback?.();
                    } else if (res.status === 1) {
                        showToast("An Error occurred while logging in.");
                    }
                } catch (e) {
                    new Logger("ReviewDB").error("Failed to authorize", e);
                }
            }}
        />
    );
}

export function showToast(text: string) {
    Toasts.show({
        type: Toasts.Type.MESSAGE,
        message: text,
        id: Toasts.genId(),
        options: {
            position: Toasts.Position.BOTTOM
        },
    });
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export function canDeleteReview(review: Review, userId: string) {
    if (review.sender.discordID === userId || Settings.plugins.ReviewDB.user?.type === UserType.Admin) return true;
}

function Modal({ modalProps, discordId, name }: { modalProps: any; discordId: string; name: string; }) {
    const [reviewCount, setReviewCount] = useState<number>();
    const [isReviewed, setIsReviewed] = useState<boolean>(false);
    const [signal, refetch] = useForceUpdater(true);

    return (
        <ErrorBoundary>
            <ModalRoot {...modalProps} >
                <ModalHeader>
                    <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>
                        {name + "'s Reviews"}
                        {reviewCount !== void 0 && " (" + reviewCount + " Reviews)"}

                    </Text>
                    <ModalCloseButton onClick={modalProps.onClose} />
                </ModalHeader>

                <ModalContent>
                    <div style={{ padding: "16px 0" }}>
                        <ReviewsView
                            refetchSignal={signal}
                            discordId={discordId}
                            name={name}
                            paginate
                            onFetchReviews={data => {
                                setReviewCount(data.reviewCount);
                                setIsReviewed(data.reviews?.some(r => r.sender.discordID === UserStore.getCurrentUser().id));
                            }}
                        />
                    </div>
                </ModalContent>

                <ModalFooter>
                    <div style={{ width: "100%" }}>
                        <ReviewsInputComponent isAuthor={isReviewed!} discordId={discordId} name={name} refetch={refetch} />
                    </div>
                </ModalFooter>
            </ModalRoot>
        </ErrorBoundary>
    );
}

export function openReviewsModal(discordId: string, name: string) {
    openModal(props => <Modal modalProps={props} discordId={discordId} name={name} />);
}
