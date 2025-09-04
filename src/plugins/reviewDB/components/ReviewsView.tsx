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

import { useAwaiter, useForceUpdater } from "@utils/react";
import { findByCodeLazy, findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Forms, React, RelationshipStore, useRef, UserStore } from "@webpack/common";

import { Auth, authorize } from "../auth";
import { Review, ReviewType } from "../entities";
import { addReview, getReviews, Response, REVIEWS_PER_PAGE } from "../reviewDbApi";
import { settings } from "../settings";
import { cl, showToast } from "../utils";
import ReviewComponent from "./ReviewComponent";

const Transforms = findByPropsLazy("insertNodes", "textToText");
const Editor = findByPropsLazy("start", "end", "toSlateRange");
const ChatInputTypes = findByPropsLazy("FORM", "USER_PROFILE");
const InputComponent = findComponentByCodeLazy("editorClassName", "CHANNEL_TEXT_AREA");
const createChannelRecordFromServer = findByCodeLazy(".GUILD_TEXT])", "fromServer)");

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
    type: ReviewType;
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
    type,
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
                profileId={discordId}
                type={type}
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

function ReviewList({ refetch, reviews, hideOwnReview, profileId, type }: { refetch(): void; reviews: Review[]; hideOwnReview: boolean; profileId: string; type: ReviewType; }) {
    const myId = UserStore.getCurrentUser().id;

    return (
        <div className={cl("view")}>
            {reviews?.map(review =>
                (review.sender.discordID !== myId || !hideOwnReview) &&
                <ReviewComponent
                    key={review.id}
                    review={review}
                    refetch={refetch}
                    profileId={profileId}
                />
            )}

            {reviews?.length === 0 && (
                <Forms.FormText className={cl("placeholder")}>
                    Looks like nobody reviewed this {type === ReviewType.User ? "user" : "server"} yet. You could be the first!
                </Forms.FormText>
            )}
        </div>
    );
}


export function ReviewsInputComponent(
    { discordId, isAuthor, refetch, name, modalKey }: { discordId: string, name: string; isAuthor: boolean; refetch(): void; modalKey?: string; }
) {
    const { token } = Auth;
    const editorRef = useRef<any>(null);
    const inputType = ChatInputTypes.USER_PROFILE_REPLY;
    inputType.disableAutoFocus = true;

    const channel = createChannelRecordFromServer({ id: "0", type: 1 });

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
                    parentModalKey={modalKey}
                    textValue=""
                    onSubmit={
                        async res => {
                            const response = await addReview({
                                userid: discordId,
                                comment: res.value,
                            });

                            if (response) {
                                refetch();

                                const slateEditor = editorRef.current.ref.current.getSlateEditor();

                                // clear editor
                                Transforms.delete(slateEditor, {
                                    at: {
                                        anchor: Editor.start(slateEditor, []),
                                        focus: Editor.end(slateEditor, []),
                                    }
                                });
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
