/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useRef } from "@webpack/common";

const Canvas = props => {

    const { draw, ...rest } = props;
    const canvasRef = useRef(null);

    useEffect(() => {

        const canvas = canvasRef.current;
        // @ts-ignore
        const context = canvas.getContext("2d");

        draw(context);

    }, [draw]);

    return <canvas ref={canvasRef} {...rest} />;
};

export default Canvas;
