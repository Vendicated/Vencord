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

import { LazyComponent, useAwaiter, useForceUpdater } from "@utils/react";
import { find, findByPropsLazy } from "@webpack";
import { Forms, React, RelationshipStore, useRef, UserStore } from "@webpack/common";

import { Review } from "../entities";
import { addReview, getReviews, Response, REVIEWS_PER_PAGE } from "../reviewDbApi";
import { settings } from "../settings";
import { authorize, cl, showToast } from "../utils";
import ReviewComponent from "./ReviewComponent";


const Editor = findByPropsLazy("start", "end", "addMark");
const Transform = findByPropsLazy("unwrapNodes");
const InputTypes = findByPropsLazy("VOICE_CHANNEL_STATUS", "SIDEBAR");

const InputComponent = LazyComponent(() => find(m => m?.type?.render?.toString().includes("CHANNEL_TEXT_AREA).AnalyticsLocationProvider")));

interface UserProps {
    discordId: string;
    name: string;
}

interface Props extends UserProps {
    onFetchReviews(data: Response): void;
    refetchSignal?: unknown;
    showInput?: boolean;
    page?: number;
    scrollToTop?(): void;
    hideOwnReview?: boolean;
}

export default function ReviewsView({
    discordId,
    name,
    onFetchReviews,
    refetchSignal,
    scrollToTop,
    page = 1,
    showInput = false,
    hideOwnReview = false,
}: Props) {
    const [signal, refetch] = useForceUpdater(true);

    const [reviewData] = useAwaiter(() => getReviews(discordId, (page - 1) * REVIEWS_PER_PAGE), {
        fallbackValue: null,
        deps: [refetchSignal, signal, page],
        onSuccess: data => {
            if (settings.store.hideBlockedUsers)
                data!.reviews = data!.reviews?.filter(r => !RelationshipStore.isBlocked(r.sender.discordID));

            scrollToTop?.();
            onFetchReviews(data!);
        }
    });

    if (!reviewData) return null;

    return (
        <>
            <ReviewList
                refetch={refetch}
                reviews={reviewData!.reviews}
                hideOwnReview={hideOwnReview}
            />

            {showInput && (
                <ReviewsInputComponent
                    name={name}
                    discordId={discordId}
                    refetch={refetch}
                    isAuthor={reviewData!.reviews?.some(r => r.sender.discordID === UserStore.getCurrentUser().id)}
                />
            )}
        </>
    );
}

function ReviewList({ refetch, reviews, hideOwnReview }: { refetch(): void; reviews: Review[]; hideOwnReview: boolean; }) {
    const myId = UserStore.getCurrentUser().id;

    return (
        <div className={cl("view")}>
            {reviews?.map(review =>
                (review.sender.discordID !== myId || !hideOwnReview) &&
                <ReviewComponent
                    key={review.id}
                    review={review}
                    refetch={refetch}
                />
            )}

            {reviews?.length === 0 && (
                <Forms.FormText className={cl("placeholder")}>
                    Looks like nobody reviewed this user yet. You could be the first!
                </Forms.FormText>
            )}
        </div>
    );
}


export function ReviewsInputComponent({ discordId, isAuthor, refetch, name }: { discordId: string, name: string; isAuthor: boolean; refetch(): void; }) {
    const { token } = settings.store;
    const editorRef = useRef<any>(null);
    const inputType = InputTypes.FORM;
    inputType.disableAutoFocus = true;

    const channel = {
        flags_: 256,
        guild_id_: null,
        id: "0",
        getGuildId: () => null,
        isPrivate: () => true,
        isActiveThread: () => false,
        isArchivedLockedThread: () => false,
        isDM: () => true,
        roles: { "0": { permissions: 0n } },
        getRecipientId: () => "0",
        hasFlag: () => false,
    };

    return (
        <>
            <div onClick={() => {
                if (!token) {
                    showToast("Opening authorization window...");
                    authorize();
                }
            }}>
                <InputComponent
                    className={cl("input")}
                    channel={channel}
                    placeholder={
                        !token
                            ? "You need to authorize to review users!"
                            : isAuthor
                                ? `Update review for @${name}`
                                : `Review @${name}`
                    }
                    type={inputType}
                    disableThemedBackground={true}
                    setEditorRef={ref => editorRef.current = ref}
                    textValue=""
                    onSubmit={
                        async res => {
                            const response = await addReview({
                                userid: discordId,
                                comment: res.value,
                            });

                            if (response?.success) {
                                refetch();

                                const slateEditor = editorRef.current.ref.current.getSlateEditor();

                                // clear editor
                                Transform.delete(slateEditor, {
                                    at: {
                                        anchor: Editor.start(slateEditor, []),
                                        focus: Editor.end(slateEditor, []),
                                    }
                                });
                            } else if (response?.message) {
                                showToast(response.message);
                            }

                            // even tho we need to return this, it doesnt do anything
                            return {
                                shouldClear: false,
                                shouldRefocus: true,
                            };
                        }
                    }
                />
            </div>

        </>
    );
}
