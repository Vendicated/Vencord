/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React, useEffect } from "@webpack/common";

type position = { x: number, y: number; };


const Draggable = (props): JSX.Element | null => {
    const { children } = props;

    const cords = React.useRef<position>({ x: 0, y: 0 });
    const isClicked = React.useRef<boolean>(false);
    useEffect(() => {
        const container = children.ref.current.parentElement;
        if (!container) return;

        console.log(children.ref.current.getBoundingClientRect());

        const onMouseDown = (e: MouseEvent) => {
            if (e.button !== 0) return;
            isClicked.current = true;
            cords.current.x = e.pageX - children.ref.current.offsetLeft;
            cords.current.y = e.pageY - children.ref.current.offsetTop;
        };

        const onMouseUp = (e: MouseEvent) => {
            isClicked.current = false;
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isClicked.current) return;

            children.ref.current.style.left = `${e.pageX - cords.current.x}px`;
            children.ref.current.style.top = `${e.pageY - cords.current.y}px`;
        };

        children.ref.current.addEventListener("mousedown", onMouseDown);
        children.ref.current.addEventListener("mouseup", onMouseUp);
        container.addEventListener("mousemove", onMouseMove);
        container.addEventListener("mouseleave", onMouseUp);

        if (!isClicked) {
            children.ref.current.removeEventListener("mousedown", onMouseDown);
            children.ref.current.removeEventListener("mouseup", onMouseUp);
            container.removeEventListener("mousemove", onMouseMove);
            container.removeEventListener("mouseleave", onMouseUp);
        }

    }, [children, isClicked]);

    return (
        <>
            {children}
        </>
    );
};

export default Draggable;
