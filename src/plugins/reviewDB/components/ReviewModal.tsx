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
import { Paginator, Text, useState } from "@webpack/common";

import { Response, REVIEWS_PER_PAGE } from "../reviewDbApi";
import { settings } from "../settings";
import { cl } from "../utils";
import ReviewsView, { ReviewsInputComponent } from "./ReviewsView";

function Modal({ modalProps, discordId, name }: { modalProps: any; discordId: string; name: string; }) {
    const [data, setData] = useState<Response>();
    const [signal, refetch] = useForceUpdater(true);
    const [page, setPage] = useState(1);

    const reviewCount = data?.reviewCount;
    const isReviewed = data?.reviews.some(r => r.sender.discordID === settings.store.user?.discordID);

    return (
        <ErrorBoundary>
            <ModalRoot {...modalProps} size={ModalSize.MEDIUM}>
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
                            discordId={discordId}
                            name={name}
                            page={page}
                            refetchSignal={signal}
                            onFetchReviews={setData}
                        />
                    </div>
                </ModalContent>

                <ModalFooter className={cl("modal-footer")}>
                    <div style={{ width: "100%" }}>
                        <ReviewsInputComponent
                            isAuthor={isReviewed ?? false}
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
