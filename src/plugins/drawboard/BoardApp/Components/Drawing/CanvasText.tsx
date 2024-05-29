/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React } from "@webpack/common";

import { overlayStore } from "../../hooks/boardStore";
import { overlayAction, overlayText } from "../../hooks/overlayStore";
import { tools } from "../../MainBoard";
import Draggable from "../Functions/Draggable";


type CanvasTextProps = React.HTMLProps<HTMLCanvasElement> & {
    setTool: React.Dispatch<React.SetStateAction<tools>>;
    draw: (ctx: CanvasRenderingContext2D) => void;
    toDispatch?: { dispatch: React.Dispatch<overlayAction>, id: number, currentState: overlayText; };
};

const CanvasText = (props: CanvasTextProps) => {
    const ref = React.useRef<HTMLCanvasElement>(null);
    const { draw, toDispatch, onMouseDown, onMouseUp, setTool, ...prop } = props;
    const currentElement = overlayStore?.getStore().find(v => v.id === toDispatch?.id);
    let oldZIndex = "";


    React.useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");

        if (!context) return;

        draw(context);
    }, [draw]);

    if (currentElement && !currentElement.node) {
        // more worse than useReducer??
        currentElement.node = ref;
        overlayStore?.dispatch([
            ...overlayStore.getStore().filter(v => v.id !== toDispatch?.id),
            currentElement
        ]);
    }

    // if (toDispatch && !toDispatch.currentState.node) {
    //     toDispatch.dispatch({ type: "update", state: { ...toDispatch.currentState, type: "text", node: ref, id: toDispatch.id } });
    // }


    const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
        if (onMouseDown) onMouseDown.call(this, event);
        setTool("select");
        oldZIndex = event.currentTarget.style.zIndex;
        event.currentTarget.style.zIndex = "99";
    };

    const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
        if (onMouseUp) onMouseUp.call(this, event);
        event.currentTarget.style.zIndex = oldZIndex;
    };


    return (
        <Draggable>
            <canvas
                ref={ref}
                onMouseDown={e => handleMouseDown(e)}
                onMouseUp={e => handleMouseUp(e)}
                {...prop}
            />
        </Draggable>
    );
};

export default CanvasText;
