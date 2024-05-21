/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { makeLazy } from "@utils/lazy";
import { React } from "@webpack/common";

type CanvasCustomProps = React.HTMLProps<HTMLCanvasElement> & {
    draw: (context: CanvasRenderingContext2D) => void;
};


const getCanvass = makeLazy(() => React.forwardRef<HTMLCanvasElement, CanvasCustomProps>((props, ref) => {
    const { draw, ...prop } = props;

    React.useEffect(() => {
        if (!ref?.current) return;
        const canvas: HTMLCanvasElement = ref.current;
        const context = canvas.getContext("2d");

        draw((context as unknown) as CanvasRenderingContext2D);
    }, [props, ref, draw]);
    return <canvas ref={ref} {...prop} />;
}));

export default getCanvass;
