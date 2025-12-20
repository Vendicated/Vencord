/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Auth } from "@plugins/reviewDB/auth";
import { ReviewType } from "@plugins/reviewDB/entities";
import { Response, REVIEWS_PER_PAGE } from "@plugins/reviewDB/reviewDbApi";
import { cl } from "@plugins/reviewDB/utils";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { useForceUpdater } from "@utils/react";
import { Paginator, Text, useRef, useState } from "@webpack/common";

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
