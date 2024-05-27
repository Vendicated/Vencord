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


const getCanvass = makeLazy(() => React.forwardRef<HTMLCanvasElement, CanvasCustomProps>(function Canvas(props, ref: React.ForwardedRef<HTMLCanvasElement>) {
    const { draw, ...prop } = props;

    // ok waht ga hell is this fix for type warning/error
    React.useEffect(() => {
        ref = ref as React.MutableRefObject<HTMLCanvasElement>;
        if (ref && !ref?.current) return;
        const canvas: HTMLCanvasElement | null = ref.current;
        if (!canvas) return;
        const context = canvas?.getContext("2d");

        draw((context as unknown) as CanvasRenderingContext2D);
    }, [props, ref, draw]);
    return <canvas ref={ref} {...prop} />;
}));

export default getCanvass;
