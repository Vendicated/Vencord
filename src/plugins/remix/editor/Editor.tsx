/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findComponentByCodeLazy } from "@webpack";
import { useEffect, useState } from "@webpack/common";

import { Canvas } from "./components/Canvas";
import { Toolbar } from "./components/Toolbar";
import { imageToBlob, urlToImage } from "./utils/canvas";

const FileUpload = findComponentByCodeLazy("fileUploadInput,");

export const Editor = (props: { url?: string; }) => {
    const [file, setFile] = useState<File | undefined>(undefined);

    useEffect(() => {
        if (!props.url) return;

        urlToImage(props.url).then(img => {
            imageToBlob(img).then(blob => {
                setFile(new File([blob], "remix.png"));
            });
        });
    }, []);

    return (
        <div className="vc-remix-editor">
            {!file && <FileUpload
                filename={undefined}
                placeholder="Choose an image"
                buttonText="Browse"
                filters={[{ name: "Image", extensions: ["png", "jpeg"] }]}
                onFileSelect={(file: File) => setFile(file)}
            />}
            {file && (<>
                <Toolbar />
                <Canvas file={file!} />
            </>)}
        </div>
    );
};
