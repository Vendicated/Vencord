/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Button, TextButton } from "@components/Button";
import { images } from "@equicordplugins/loginWithQR/images";
import { getIntlMessage } from "@utils/discord";
import {
    ModalContent,
    ModalFooter,
    ModalProps,
    ModalRoot,
    ModalSize,
    openModal,
} from "@utils/modal";
import { findByPropsLazy } from "@webpack";
import {
    RestAPI,
    useEffect,
    useRef,
    useState,
} from "@webpack/common";

import { cl } from "..";

const { Controller } = findByPropsLazy("Controller");

enum VerifyState {
    Verifying,
    LoggedIn,
    NotFound,
}

function VerifyModal({
    token,
    onAbort,
    closeMain,
    ...props
}: {
    token: string | null;
    onAbort: () => void;
    closeMain: () => void;
} & ModalProps) {
    const [state, setState] = useState(
        !token ? VerifyState.NotFound : VerifyState.Verifying
    );
    useEffect(() => () => void (state !== VerifyState.LoggedIn && onAbort()), []);

    const [inProgress, setInProgress] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const controllerRef = useRef(new Controller({ progress: "0%" })).current;

    const holdDuration = 1000;
    let timeout: any;
    const startInput = () => {
        if (!buttonRef.current) return;

        controllerRef.start({
            progress: "100%",
            config: {
                duration: holdDuration,
                // https://easings.net/#easeInOutSine
                easing: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
            },
        });
        timeout = setTimeout(() => {
            if (state !== VerifyState.Verifying) return;

            setInProgress(true);
            RestAPI.post({
                url: "/users/@me/remote-auth/finish",
                body: {
                    handshake_token: token,
                },
            })
                .then(() => {
                    closeMain();
                    setState(VerifyState.LoggedIn);
                })
                .catch(() => setState(VerifyState.NotFound))
                .finally(() => setInProgress(false));
        }, holdDuration + 250);
    };

    const endInput = () => {
        if (!buttonRef.current) return;

        controllerRef.start({
            progress: "0%",
            config: {
                duration: 696,
                // https://easings.net/#easeOutCubic
                easing: (t: number) => 1 - Math.pow(1 - t, 3),
            },
        });
        clearTimeout(timeout);
    };

    useEffect(() => {
        let frame: number;
        const update = () => {
            buttonRef.current?.style.setProperty(
                "--progress",
                controllerRef.get().progress
            );

            frame = requestAnimationFrame(update);
        };

        if (state === VerifyState.Verifying) requestAnimationFrame(update);
        return () => cancelAnimationFrame(frame);
    }, [state]);

    return (
        <ModalRoot size={ModalSize.DYNAMIC} {...props}>
            <ModalContent scrollbarType="none" className={cl("device-content")}>
                {state === VerifyState.LoggedIn ? (
                    <>
                        <img
                            className={cl("device-image")}
                            src={images.deviceImage.success}
                            key="img-success"
                            draggable={false}
                        />
                        <BaseText
                            size="xl"
                            weight="bold"
                            color="text-strong"
                            tag="h1"
                            className={cl("device-header")}
                        >
                            {getIntlMessage("QR_CODE_LOGIN_SUCCESS")}
                        </BaseText>
                        <BaseText
                            size="md"
                            weight="semibold"
                            color="text-default"
                            style={{ width: "30rem", textAlign: "center" }}
                        >
                            {getIntlMessage("QR_CODE_LOGIN_SUCCESS_FLAVOR")}
                        </BaseText>
                    </>
                ) : state === VerifyState.NotFound ? (
                    <>
                        <img
                            className={cl("device-image")}
                            src={images.deviceImage.notFound}
                            key="img-not_found"
                            draggable={false}
                        />
                        <BaseText
                            size="xl"
                            weight="bold"
                            color="text-strong"
                            tag="h1"
                            className={cl("device-header")}
                        >
                            {getIntlMessage("QR_CODE_NOT_FOUND")}
                        </BaseText>
                        <BaseText
                            size="md"
                            weight="semibold"
                            color="text-default"
                            style={{ width: "30rem" }}
                        >
                            {getIntlMessage("QR_CODE_NOT_FOUND_DESCRIPTION")}
                        </BaseText>
                    </>
                ) : (
                    <>
                        <img
                            className={cl("device-image")}
                            src={images.deviceImage.loading}
                            key="img-loaded"
                            draggable={false}
                        />
                        <BaseText
                            size="xl"
                            weight="bold"
                            color="text-strong"
                            tag="h1"
                            className={cl("device-header")}
                        >
                            {getIntlMessage("QR_CODE_LOGIN_CONFIRM")}
                        </BaseText>
                        <BaseText size="md" weight="semibold" color="text-danger">
                            Never scan a login QR code from another user or application.
                        </BaseText>
                        <Button
                            size="medium"
                            variant="dangerPrimary"
                            className={cl("device-confirm")}
                            style={{
                                ["--duration" as any]: `${holdDuration}ms`,
                            }}
                            onPointerDown={startInput}
                            onPointerUp={endInput}
                            ref={buttonRef}
                            disabled={inProgress}
                        >
                            Hold to confirm login
                        </Button>
                    </>
                )}
            </ModalContent>
            <ModalFooter className={cl("device-footer")}>
                {state === VerifyState.LoggedIn ? (
                    <Button onClick={props.onClose}>
                        {getIntlMessage("QR_CODE_LOGIN_FINISH_BUTTON")}
                    </Button>
                ) : (
                    <TextButton
                        variant="link"
                        onClick={props.onClose}
                    >
                        {state === VerifyState.NotFound
                            ? getIntlMessage("CLOSE")
                            : getIntlMessage("CANCEL")}
                    </TextButton>
                )}
            </ModalFooter>
        </ModalRoot>
    );
}

export default function openVerifyModal(
    token: string | null,
    onAbort: () => void,
    closeMain: () => void
) {
    return openModal(props => (
        <VerifyModal
            {...props}
            token={token}
            onAbort={onAbort}
            closeMain={closeMain}
        />
    ));
}
