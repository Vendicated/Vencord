/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { makeLazy } from "@utils/lazy";
import { React } from "@webpack/common";

import { tools } from "../../MainBoard";

type customExtendedProps = React.HTMLProps<HTMLImageElement> & {
    setTool: React.Dispatch<React.SetStateAction<tools>>;
};

const getImageOverlay = makeLazy(() => React.forwardRef<HTMLImageElement, customExtendedProps>((props, ref) => {
    const { onMouseDown, onMouseUp, onMouseMove, onMouseLeave, onMouseOut, style, setTool, ...prop } = props;
    const [pressed, setPressed] = React.useState(false);
    let oldZIndex = "";

    const handleMouseDown = (event: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
        if (onMouseDown) onMouseDown.call(this, event);
        setTool.call(this, "select");
        event.currentTarget.style.userSelect = "none";
        oldZIndex = event.currentTarget.style.zIndex;
        event.currentTarget.style.zIndex = "99";
        setPressed(true);
    };

    const handleMouseUp = (event: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
        if (onMouseUp) onMouseUp.call(this, event);
        event.currentTarget.style.userSelect = "auto";
        event.currentTarget.style.zIndex = oldZIndex;
        setPressed(false);
    };

    const handleMouseMove = (event: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
        if (onMouseMove) onMouseMove.call(this, event);
        if (!pressed) return;
    };

    const handleMouseLeave = (event: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
        if (onMouseLeave) onMouseLeave.call(this, event);
        setPressed(false);
    };

    const handleMouseOut = (event: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
        if (onMouseOut) onMouseOut.call(this, event);
        setPressed(false);
    };

    return (
        <img
            onMouseDown={e => handleMouseDown(e)}
            onMouseUp={e => handleMouseUp(e)}
            onMouseMove={e => handleMouseMove(e)}
            onMouseLeave={e => handleMouseLeave(e)}
            onMouseOut={e => handleMouseOut(e)}
            ref={ref}
            style={{
                ...style,
                position: "absolute",
                resize: "none",
            }}
            draggable={"false"}
            {...prop}
        />
    );
}));

export default getImageOverlay;
