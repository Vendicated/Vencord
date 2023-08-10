/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { useForceUpdater } from "@utils/react";
import { Paginator, Text, useRef, useState } from "@webpack/common";

import { Response, REVIEWS_PER_PAGE } from "../reviewDbApi";
import { settings } from "../settings";
import { cl } from "../utils";
import ReviewComponent from "./ReviewComponent";
import ReviewsView, { ReviewsInputComponent } from "./ReviewsView";

function Modal({ modalProps, discordId, name }: { modalProps: any; discordId: string; name: string; }) {
    const [data, setData] = useState<Response>();
    const [signal, refetch] = useForceUpdater(true);
    const [page, setPage] = useState(1);

    const ref = useRef<HTMLDivElement>(null);

    const reviewCount = data?.reviewCount;
    const ownReview = data?.reviews.find(r => r.sender.discordID === settings.store.user?.discordID);

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
                        />
                    </div>
                </ModalContent>

                <ModalFooter className={cl("modal-footer")}>
                    <div>
                        {ownReview && (
                            <ReviewComponent
                                refetch={refetch}
                                review={ownReview}
                            />
                        )}
                        <ReviewsInputComponent
                            isAuthor={ownReview != null}
                            discordId={discordId}
                            name={name}
                            refetch={refetch}
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

export function openReviewsModal(discordId: string, name: string) {
    openModal(props => (
        <Modal
            modalProps={props}
            discordId={discordId}
            name={name}
        />
    ));
}
