/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { closeModal, ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { Button, Text, useEffect, useState } from "@webpack/common";

export function DependencyModal({ props, options: { key, checkytdlp, checkffmpeg } }: {
    props: ModalProps;
    options: {
        key: string;
        checkytdlp: () => Promise<boolean>;
        checkffmpeg: () => Promise<boolean>;
    };
}) {
    const checking = <span>Checking...</span>;
    const installed = <span style={{ color: "green" }}>Installed!</span>;
    const notInstalled = (color: string) => <span style={{ color }}>Not installed.</span>;

    const [ytdlpStatus, setYtdlpStatus] = useState(checking);
    const [ffmpegStatus, setFfmpegStatus] = useState(checking);

    useEffect(() => {
        checkytdlp().then(v => v ? setYtdlpStatus(installed) : setYtdlpStatus(notInstalled("red")));
        checkffmpeg().then(v => v ? setFfmpegStatus(installed) : setFfmpegStatus(notInstalled("yellow")));
    }, []);

    return (
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>yt-dlp: Missing dependencies</Text>
                <ModalCloseButton onClick={() => closeModal(key)} />
            </ModalHeader>
            <ModalContent>
                <div style={{ padding: "16px 0" }}>
                    <Text variant="text-md/normal" >
                        The yt-dlp plugin requires a working version of yt-dlp to be installed on your system. For extra features such as higher quality videos and gifs, you can also optionally install ffmpeg.
                        <br /><br />
                        If you don't know how to install yt-dlp or ffmpeg, check the installation guides below (if you <i>do</i> know how to install it, make sure it's in your PATH).
                        <br /><br />
                        <strong>Note:</strong> You may need to completely restart Discord after installing yt-dlp or ffmpeg for the plugin to detect them.
                        <br /><br />
                        <ul style={{ listStyleType: "disc", marginLeft: "1rem" }}>
                            <li>
                                <a href="https://github.com/yt-dlp/yt-dlp/wiki/Installation#with-pip" target="_blank" rel="noreferrer">yt-dlp installation guide</a>
                            </li>
                            <li>
                                <a href="https://phoenixnap.com/kb/ffmpeg-windows" target="_blank" rel="noreferrer">Unofficial ffmpeg installation guide</a>
                            </li>
                        </ul>
                    </Text>
                    <div style={{
                        marginTop: "16px",
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gridTemplateRows: "repeat(2, 1fr)",
                        columnGap: "16px",
                        rowGap: "8px"
                    }}>
                        <div
                            style={{
                                gridArea: "1 / 1 / 2 / 2",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                        >
                            <Text variant="text-md/bold">
                                yt-dlp status: {ytdlpStatus}
                            </Text>
                        </div>
                        <Button
                            onClick={async () => {
                                setYtdlpStatus(checking);
                                setYtdlpStatus(await checkytdlp()
                                    ? installed
                                    : notInstalled("red"));
                            }}
                            style={{ gridArea: "1 / 2 / 2 / 3" }}
                        >
                            Check again
                        </Button>
                        <div
                            style={{
                                gridArea: "2 / 1 / 3 / 2",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"

                            }}
                        >
                            <Text variant="text-md/bold">
                                ffmpeg status: {ffmpegStatus}
                            </Text>
                        </div>
                        <Button
                            onClick={async () => {
                                setFfmpegStatus(checking);
                                setFfmpegStatus(await checkffmpeg()
                                    ? installed
                                    : notInstalled("yellow"));
                            }}
                            style={{ gridArea: "2 / 2 / 3 / 3" }}
                        >
                            Check again
                        </Button>
                    </div>
                </div>
            </ModalContent>
        </ModalRoot>
    );
}
