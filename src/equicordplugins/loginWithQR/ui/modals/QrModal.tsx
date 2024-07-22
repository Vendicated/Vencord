/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    ModalContent,
    ModalHeader,
    ModalProps,
    ModalRoot,
    ModalSize,
    openModal,
} from "@utils/modal";
import { findByPropsLazy } from "@webpack";
import {
    Button,
    i18n,
    RestAPI,
    Text,
    useEffect,
    useRef,
    useState,
} from "@webpack/common";
import jsQR from "jsqr";

import { cl, Spinner, SpinnerTypes } from "..";
import openVerifyModal from "./VerifyModal";

enum LoginStateType {
    Idle,
    Loading,
    Camera,
}

const { getVideoDeviceId } = findByPropsLazy("getVideoDeviceId");

const tokenRegex = /^https:\/\/discord\.com\/ra\/(.+)$/;

const verifyUrl = async (
    token: string,
    exit: (err: string | null) => void,
    closeMain: () => void
) => {
    // yay
    let handshake: string | null = null;
    try {
        const res = await RestAPI.post({
            url: "/users/@me/remote-auth",
            body: { fingerprint: token },
        });
        if (res.ok && res.status === 200) handshake = res.body?.handshake_token;
    } catch { }

    openVerifyModal(
        handshake,
        () => {
            exit(null);
            RestAPI.post({
                url: "/users/@me/remote-auth/cancel",
                body: { handshake_token: handshake },
            });
        },
        closeMain
    );
};

const handleProcessImage = (
    file: File,
    exit: (err: string | null) => void,
    closeMain: () => void
) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
        if (!reader.result) return;

        const img = new Image();
        img.addEventListener("load", () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0);
            const { data, width, height } = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
            );
            const code = jsQR(data, width, height);

            const token = code?.data.match(tokenRegex)?.[1];
            if (token)
                verifyUrl(token, exit, closeMain).catch(e =>
                    exit(e?.message)
                );
            else exit(null);
            canvas.remove();
        });
        img.src = reader.result as string;
    });
    reader.readAsDataURL(file);
};

function QrModal(props: ModalProps) {
    const [state, setState] = useState(LoginStateType.Idle);
    const inputRef = useRef<HTMLInputElement>(null);
    const error = useRef<string | null>(null);

    useEffect(() => {
        const plugin = Vencord.Plugins.plugins.LoginWithQR as any;

        plugin.qrModalOpen = true;
        return () => void (plugin.qrModalOpen = false);
    }, []);

    useEffect(() => {
        const callback = (e: ClipboardEvent) => {
            e.preventDefault();
            if (state !== LoginStateType.Idle || !e.clipboardData) return;

            for (const item of e.clipboardData.items) {
                if (item.kind === "file" && item.type.startsWith("image/")) {
                    setState(LoginStateType.Loading);
                    handleProcessImage(
                        item.getAsFile()!,
                        err => (
                            (error.current = err), setState(LoginStateType.Idle)
                        ),
                        props.onClose
                    );
                    break;
                }
            }
        };

        if (state === LoginStateType.Idle)
            document.addEventListener("paste", callback);
        return () => document.removeEventListener("paste", callback);
    }, [state]);

    useEffect(() => {
        if (state !== LoginStateType.Camera) return;

        const exit = (err: string | null) => (
            (error.current = err), setState(LoginStateType.Idle)
        );

        const video = document.createElement("video");
        const canvas = document.createElement("canvas");
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext("2d")!;

        let stream: MediaStream;
        let snapshotTimeout: number;
        let stopped = false;

        const stop = (stream: MediaStream) => (
            stream.getTracks().forEach(track => track.stop()),
            setState(LoginStateType.Idle)
        );
        const snapshot = () => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const { data, width, height } = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
            );
            const code = jsQR(data, width, height);

            const token = code?.data.match(tokenRegex)?.[1];
            if (token) {
                setState(LoginStateType.Loading);
                verifyUrl(token, exit, props.onClose).catch(e =>
                    exit(e?.message)
                );
            } else snapshotTimeout = setTimeout(snapshot, 1000) as any;
        };

        navigator.mediaDevices
            .getUserMedia({
                audio: false,
                video: {
                    deviceId: getVideoDeviceId(),
                    width: canvas.width,
                    height: canvas.height,
                    frameRate: 5
                },
            })
            .then(str => {
                if (stopped) return stop(str);

                stream = str;
                video.srcObject = str;
                video.addEventListener("loadedmetadata", () => {
                    video.play();
                    snapshot();
                });
            })
            .catch(() => setState(LoginStateType.Idle));

        return () => {
            stopped = true;
            clearTimeout(snapshotTimeout);
            if (stream) stop(stream);

            video.remove();
            canvas.remove();
        };
    }, [state]);

    return (
        <ModalRoot size={ModalSize.DYNAMIC} {...props}>
            <ModalHeader separator={false} className={cl("modal-header")}>
                <Text
                    color="header-primary"
                    variant="heading-lg/semibold"
                    tag="h1"
                    style={{ flexGrow: 1 }}
                >
                    {i18n.Messages.USER_SETTINGS_SCAN_QR_CODE}
                </Text>
            </ModalHeader>
            <ModalContent scrollbarType="none">
                <div
                    className={cl(
                        "modal-filepaste",
                        state === LoginStateType.Camera &&
                        "modal-filepaste-disabled"
                    )}
                    onClick={() =>
                        state === LoginStateType.Idle &&
                        inputRef.current?.click()
                    }
                    onDragEnter={e =>
                        e.currentTarget.classList.add(
                            cl("modal-filepaste-drop")
                        )
                    }
                    onDragLeave={e =>
                        e.currentTarget.classList.remove(
                            cl("modal-filepaste-drop")
                        )
                    }
                    onDrop={e => {
                        e.preventDefault();
                        e.currentTarget.classList.remove(
                            cl("modal-filepaste-drop")
                        );

                        if (state !== LoginStateType.Idle) return;

                        for (const item of e.dataTransfer.files) {
                            if (item.type.startsWith("image/")) {
                                setState(LoginStateType.Loading);
                                handleProcessImage(
                                    item,
                                    err => (
                                        (error.current = err),
                                        setState(LoginStateType.Idle)
                                    ),
                                    props.onClose
                                );
                                break;
                            }
                        }
                    }}
                    role="button"
                >
                    {state === LoginStateType.Loading ? (
                        <Spinner type={SpinnerTypes.WANDERING_CUBES} />
                    ) : error.current ? (
                        <Text color="text-danger" variant="heading-md/semibold">
                            {error.current}
                        </Text>
                    ) : state === LoginStateType.Camera ? (
                        <Text
                            color="header-primary"
                            variant="heading-md/semibold"
                        >
                            Scanning...
                        </Text>
                    ) : (
                        <>
                            <Text
                                color="header-primary"
                                variant="heading-md/semibold"
                            >
                                Drag and drop an image here, or click to select
                                an image
                            </Text>
                            <Text
                                color="text-muted"
                                variant="heading-sm/medium"
                            >
                                Or paste an image from your clipboard!
                            </Text>
                        </>
                    )}
                </div>
                <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                        if (!e.target.files || state !== LoginStateType.Idle)
                            return;

                        for (const item of e.target.files) {
                            if (item.type.startsWith("image/")) {
                                setState(LoginStateType.Loading);
                                handleProcessImage(
                                    item,
                                    err => (
                                        (error.current = err),
                                        setState(LoginStateType.Idle)
                                    ),
                                    props.onClose
                                );
                                break;
                            }
                        }
                    }}
                    ref={inputRef}
                    style={{ display: "none" }}
                />
                <Button
                    size={Button.Sizes.MEDIUM}
                    className={cl("modal-button")}
                    disabled={state === LoginStateType.Loading}
                    onClick={() => {
                        if (state === LoginStateType.Idle)
                            setState(LoginStateType.Camera);
                        else if (state === LoginStateType.Camera)
                            setState(LoginStateType.Idle);
                    }}
                >
                    {state === LoginStateType.Camera
                        ? "Stop scanning"
                        : "Scan using webcamera"}
                </Button>
            </ModalContent>
        </ModalRoot>
    );
}

export default function openQrModal() {
    return openModal(props => <QrModal {...props} />);
}
