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
import jsQR, { QRCode } from "jsqr";
import { MutableRefObject, ReactElement } from "react";

import { images } from "../../images";
import { cl, Spinner, SpinnerTypes } from "..";
import openVerifyModal from "./VerifyModal";

enum LoginStateType {
    Idle,
    Loading,
    Camera,
}

interface Preview {
    source: ReactElement;
    size: {
        width: number;
        height: number;
    };
    crosses?: { x: number; y: number; rot: number; size: number; }[];
}

interface QrModalProps {
    exit: (err: string | null) => void;
    setPreview: (
        media: HTMLImageElement | HTMLVideoElement | null,
        location?: QRCode["location"]
    ) => Promise<void>;
    closeMain: () => void;
}
type QrModalPropsRef = MutableRefObject<QrModalProps>;

const limitSize = (width: number, height: number) => {
    if (width > height) {
        const w = Math.min(width, 1280);
        return { w, h: (height / width) * w };
    } else {
        const h = Math.min(height, 1280);
        return { h, w: (width / height) * h };
    }
};

const { getVideoDeviceId } = findByPropsLazy("getVideoDeviceId");

const tokenRegex = /^https:\/\/discord\.com\/ra\/([\w-]+)$/;
const verifyUrl = async (
    token: string,
    { current: modalProps }: QrModalPropsRef
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

    modalProps.setPreview(null);
    openVerifyModal(
        handshake,
        () => {
            modalProps.exit(null);
            RestAPI.post({
                url: "/users/@me/remote-auth/cancel",
                body: { handshake_token: handshake },
            });
        },
        modalProps.closeMain
    );
};

const handleProcessImage = (file: File, modalPropsRef: QrModalPropsRef) => {
    const { current: modalProps } = modalPropsRef;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
        if (!reader.result) return;

        const img = new Image();
        img.addEventListener("load", () => {
            modalProps.setPreview(img);
            const { w, h } = limitSize(img.width, img.height);
            img.width = w;
            img.height = h;

            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const { data, width, height } = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
            );
            const code = jsQR(data, width, height);

            const token = code?.data.match(tokenRegex)?.[1];
            if (token)
                modalProps
                    .setPreview(img, code.location)
                    .then(() =>
                        verifyUrl(token, modalPropsRef).catch(e =>
                            modalProps.exit(e?.message)
                        )
                    );
            else modalProps.exit(null);

            canvas.remove();
        });
        img.src = reader.result as string;
    });
    reader.readAsDataURL(file);
};

function QrModal(props: ModalProps) {
    const [state, setState] = useState(LoginStateType.Idle);
    const [preview, setPreview] = useState<Preview | null>(null);
    const error = useRef<string | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);

    const modalProps = useRef<QrModalProps>({
        exit: err => {
            error.current = err;
            setState(LoginStateType.Idle);
            setPreview(null);
        },
        setPreview: (media, location) =>
            new Promise(res => {
                if (!media) return res(setPreview(null));

                const size = {} as Preview["size"];
                if (media.width > media.height) {
                    size.width = 34;
                    size.height = (media.height / media.width) * 34;
                } else {
                    size.height = 34;
                    size.width = (media.width / media.height) * 34;
                }

                let source: ReactElement;
                if (media instanceof HTMLImageElement)
                    source = (
                        <img src={media.src} style={{ width: "100%", height: "100%" }} />
                    );
                else
                    source = (
                        <video
                            controls={false}
                            style={{ width: "100%", height: "100%" }}
                            ref={e =>
                                e &&
                                ((e.srcObject = media.srcObject), !media.paused && e.play())
                            }
                        />
                    );

                if (!location) return res(setPreview({ source, size }));
                else {
                    const combinations = [
                        [location.topLeftCorner, location.bottomRightCorner],
                        [location.topRightCorner, location.bottomLeftCorner],
                    ];

                    const crossSize =
                        (Math.sqrt(
                            Math.abs(location.topLeftCorner.x - location.topRightCorner.x) **
                            2 +
                            Math.abs(
                                location.topLeftCorner.y - location.topRightCorner.y
                            ) **
                            2
                        ) +
                            Math.sqrt(
                                Math.abs(
                                    location.topRightCorner.x - location.bottomRightCorner.x
                                ) **
                                2 +
                                Math.abs(
                                    location.topRightCorner.y - location.bottomRightCorner.y
                                ) **
                                2
                            )) /
                        3 /
                        media.height;

                    const crosses = [] as NonNullable<Preview["crosses"]>;
                    for (const combination of combinations) {
                        for (let i = 0; i < 2; i++) {
                            const current = combination[i];
                            const opposite = combination[1 - i];

                            const rot =
                                (Math.atan2(opposite.y - current.y, opposite.x - current.x) -
                                    Math.PI / 4) *
                                (180 / Math.PI);

                            crosses.push({
                                x: (current.x / media.width) * 100,
                                y: (current.y / media.height) * 100,
                                rot,
                                size: Math.min(crossSize * size.height, 7),
                            });
                        }
                    }

                    setPreview({ source, size, crosses });
                    setTimeout(res, 500 + 300 + 300);
                }
            }),
        closeMain: props.onClose,
    });

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
                    handleProcessImage(item.getAsFile()!, modalProps);
                    break;
                } else if (item.kind === "string" && item.type === "text/plain") {
                    item.getAsString(text => {
                        setState(LoginStateType.Loading);

                        const token = text.match(tokenRegex)?.[1];
                        if (token)
                            verifyUrl(token, modalProps).catch(e =>
                                modalProps.current.exit(e?.message)
                            );
                        else modalProps.current.exit(null);
                    });
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

        const video = document.createElement("video");
        video.width = 1280;
        video.height = 720;
        const canvas = document.createElement("canvas");
        canvas.width = video.width;
        canvas.height = video.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

        let stream: MediaStream;
        let snapshotTimeout: number;
        let stopped = false;

        const stop = (stream: MediaStream) => (
            stream.getTracks().forEach(track => track.stop()),
            modalProps.current.exit(null)
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
                const img = new Image();
                img.addEventListener("load", () =>
                    modalProps.current
                        .setPreview(img, code.location)
                        .then(
                            () => (
                                img.remove(),
                                verifyUrl(token, modalProps).catch(e =>
                                    modalProps.current.exit(e?.message)
                                )
                            )
                        )
                );
                canvas.toBlob(blob => blob && (img.src = URL.createObjectURL(blob)));
            } else snapshotTimeout = setTimeout(snapshot, 1e3) as any;
        };

        navigator.mediaDevices
            .getUserMedia({
                audio: false,
                video: {
                    deviceId: getVideoDeviceId(),
                    width: canvas.width,
                    height: canvas.height,
                    frameRate: 30,
                },
            })
            .then(str => {
                if (stopped) return stop(str);

                stream = str;
                video.srcObject = str;
                video.addEventListener("loadedmetadata", () => {
                    if (stopped) return stop(str);

                    video.play();
                    modalProps.current.setPreview(video);
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
                        !preview?.source &&
                        "modal-filepaste-disabled",
                        preview?.source && "modal-filepaste-preview",
                        preview?.crosses && "modal-filepaste-crosses"
                    )}
                    onClick={() =>
                        state === LoginStateType.Idle && inputRef.current?.click()
                    }
                    onDragEnter={e =>
                        e.currentTarget.classList.add(cl("modal-filepaste-drop"))
                    }
                    onDragLeave={e =>
                        e.currentTarget.classList.remove(cl("modal-filepaste-drop"))
                    }
                    onDrop={e => {
                        e.preventDefault();
                        e.currentTarget.classList.remove(cl("modal-filepaste-drop"));

                        if (state !== LoginStateType.Idle) return;

                        for (const item of e.dataTransfer.files) {
                            if (item.type.startsWith("image/")) {
                                setState(LoginStateType.Loading);
                                handleProcessImage(item, modalProps);
                                break;
                            }
                        }
                    }}
                    role="button"
                    style={
                        preview?.size
                            ? {
                                width: `${preview.size.width}rem`,
                                height: `${preview.size.height}rem`,
                            }
                            : {}
                    }
                >
                    {preview?.source ? (
                        <div
                            style={{
                                width: "100%",
                                height: "100%",
                                position: "relative",
                                ["--scale" as any]: preview.crosses
                                    ? Math.max(preview.crosses[0].size * 0.9, 1)
                                    : undefined,
                                ["--offset-x" as any]: preview.crosses
                                    ? `${-(preview.crosses.reduce((i, { x }) => i + x, 0) /
                                        preview.crosses.length -
                                        50)}%`
                                    : undefined,
                                ["--offset-y" as any]: preview.crosses
                                    ? `${-(preview.crosses.reduce((i, { y }) => i + y, 0) /
                                        preview.crosses.length -
                                        50)}%`
                                    : undefined,
                            }}
                            className={cl(preview?.crosses && "preview-crosses")}
                        >
                            {preview.source}
                            {preview.crosses?.map(({ x, y, rot, size }) => (
                                <span
                                    className={cl("preview-cross")}
                                    style={{
                                        left: `${x}%`,
                                        top: `${y}%`,
                                        ["--size" as any]: `${size}rem`,
                                        ["--rot" as any]: `${rot}deg`,
                                    }}
                                >
                                    <img src={images.cross} draggable={false} />
                                </span>
                            ))}
                        </div>
                    ) : state === LoginStateType.Loading ? (
                        <Spinner type={SpinnerTypes.WANDERING_CUBES} />
                    ) : error.current ? (
                        <Text color="text-danger" variant="heading-md/semibold">
                            {error.current}
                        </Text>
                    ) : state === LoginStateType.Camera ? (
                        <Text color="header-primary" variant="heading-md/semibold">
                            Scanning...
                        </Text>
                    ) : (
                        <>
                            <Text color="header-primary" variant="heading-md/semibold">
                                Drag and drop an image here, or click to select an image
                            </Text>
                            <Text color="text-muted" variant="heading-sm/medium">
                                Or paste an image from your clipboard!
                            </Text>
                        </>
                    )}
                </div>
                <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                        if (!e.target.files || state !== LoginStateType.Idle) return;

                        for (const item of e.target.files) {
                            if (item.type.startsWith("image/")) {
                                setState(LoginStateType.Loading);
                                handleProcessImage(item, modalProps);
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
                        if (state === LoginStateType.Idle) setState(LoginStateType.Camera);
                        else if (state === LoginStateType.Camera)
                            modalProps.current.exit(null);
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
