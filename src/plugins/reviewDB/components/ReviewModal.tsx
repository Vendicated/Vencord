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

import ErrorBoundary from "@components/ErrorBoundary";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { useForceUpdater } from "@utils/react";
import { Paginator, Text, useRef, useState } from "@webpack/common";

import { Auth } from "../auth";
import { ReviewType } from "../entities";
import { Response, REVIEWS_PER_PAGE } from "../reviewDbApi";
import { cl } from "../utils";
import ReviewComponent from "./ReviewComponent";
import ReviewsView, { ReviewsInputComponent } from "./ReviewsView";

function Modal({ modalProps, modalKey, discordId, name, type }: { modalProps: any; modalKey: string, discordId: string; name: string; type: ReviewType; }) {
    const [data, setData] = useState<Response>();
    const [signal, refetch] = useForceUpdater(true);
    const [page, setPage] = useState(1);

    const ref = useRef<HTMLDivElement>(null);

    const reviewCount = data?.reviewCount;
    const ownReview = data?.reviews.find(r => r.sender.discordID === Auth.user?.discordID);

    return (
        <ErrorBoundary>
            <ModalRoot {...modalProps} size={ModalSize.MEDIUM}>
                <ModalHeader>
                    <Text variant="heading-lg/semibold" className={cl("modal-header")}>
                        {name}'s Reviews
                        {!!reviewCount && <span> ({reviewCount} Reviews)</span>}
                    </Text>
                    <ModalCloseButton onClick={modalProps.onClose} />
                </ModalHeader>

                <ModalContent scrollerRef={ref}>
                    <div className={cl("modal-reviews")}>
                        <ReviewsView
                            discordId={discordId}
                            name={name}
                            page={page}
                            refetchSignal={signal}
                            onFetchReviews={setData}
                            scrollToTop={() => ref.current?.scrollTo({ top: 0, behavior: "smooth" })}
                            hideOwnReview
                            type={type}
                        />
                    </div>
                </ModalContent>

                <ModalFooter className={cl("modal-footer")}>
                    <div className={cl("modal-footer-wrapper")}>
                        {ownReview && (
                            <ReviewComponent
                                refetch={refetch}
                                review={ownReview}
                                profileId={discordId}
                            />
                        )}
                        <ReviewsInputComponent
                            isAuthor={ownReview != null}
                            discordId={discordId}
                            name={name}
                            refetch={refetch}
                            modalKey={modalKey}
                        />

                        {!!reviewCount && (
                            <Paginator
                                currentPage={page}
                                maxVisiblePages={5}
                                pageSize={REVIEWS_PER_PAGE}
                                totalCount={reviewCount}
                                onPageChange={setPage}
                            />
                        )}
                    </div>
                </ModalFooter>
            </ModalRoot>
        </ErrorBoundary>
    );
}

export function openReviewsModal(discordId: string, name: string, type: ReviewType) {
    const modalKey = "vc-rdb-modal-" + Date.now();

    openModal(props => (
        <Modal
            modalKey={modalKey}
            modalProps={props}
            discordId={discordId}
            name={name}
            type={type}
        />
    ), { modalKey });
}
