/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { FluxDispatcher, useLayoutEffect, useRef, useState } from "@webpack/common";

import { ELEMENT_ID } from "../constants";
import { settings } from "../index";
import { waitFor } from "../utils/waitFor";

interface Vec2 {
    x: number,
    y: number;
}

export interface MagnifierProps {
    zoom: number;
    size: number,
    instance: any;
}

const cl = classNameFactory("vc-imgzoom-");

export const Magnifier = ErrorBoundary.wrap<MagnifierProps>(({ instance, size: initialSize, zoom: initalZoom }) => {
    const [ready, setReady] = useState(false);

    const [lensPosition, setLensPosition] = useState<Vec2>({ x: 0, y: 0 });
    const [imagePosition, setImagePosition] = useState<Vec2>({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const isShiftDown = useRef(false);

    const zoom = useRef(initalZoom);
    const size = useRef(initialSize);

    const element = useRef<HTMLDivElement | null>(null);
    const currentVideoElementRef = useRef<HTMLVideoElement | null>(null);
    const originalVideoElementRef = useRef<HTMLVideoElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    // since we accessing document im gonna use useLayoutEffect
    useLayoutEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Shift") {
                isShiftDown.current = true;
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key === "Shift") {
                isShiftDown.current = false;
            }
        };
        const syncVideos = () => {
            if (currentVideoElementRef.current && originalVideoElementRef.current)
                currentVideoElementRef.current.currentTime = originalVideoElementRef.current.currentTime;
        };

        const updateMousePosition = (e: MouseEvent) => {
            if (!element.current) return;

            if (instance.state.mouseOver && instance.state.mouseDown) {
                const offset = size.current / 2;
                const pos = { x: e.pageX, y: e.pageY };
                const x = -((pos.x - element.current.getBoundingClientRect().left) * zoom.current - offset);
                const y = -((pos.y - element.current.getBoundingClientRect().top) * zoom.current - offset);
                setLensPosition({ x: e.x - offset, y: e.y - offset });
                setImagePosition({ x, y });
                setOpacity(1);
            } else {
                setOpacity(0);
            }

        };

        const onMouseDown = (e: MouseEvent) => {
            if (instance.state.mouseOver && e.button === 0 /* left click */) {
                zoom.current = settings.store.zoom;
                size.current = settings.store.size;

                // close context menu if open
                if (document.getElementById("image-context")) {
                    FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" });
                }

                updateMousePosition(e);
                setOpacity(1);
            }
        };

        const onMouseUp = () => {
            setOpacity(0);
            if (settings.store.saveZoomValues) {
                settings.store.zoom = zoom.current;
                settings.store.size = size.current;
            }
        };

        const onWheel = async (e: WheelEvent) => {
            if (instance.state.mouseOver && instance.state.mouseDown && !isShiftDown.current) {
                const val = zoom.current + ((e.deltaY / 100) * (settings.store.invertScroll ? -1 : 1)) * settings.store.zoomSpeed;
                zoom.current = val <= 1 ? 1 : val;
                updateMousePosition(e);
            }
            if (instance.state.mouseOver && instance.state.mouseDown && isShiftDown.current) {
                const val = size.current + (e.deltaY * (settings.store.invertScroll ? -1 : 1)) * settings.store.zoomSpeed;
                size.current = val <= 50 ? 50 : val;
                updateMousePosition(e);
            }
        };

        waitFor(() => instance.state.readyState === "READY", () => {
            const elem = document.getElementById(ELEMENT_ID) as HTMLDivElement;
            element.current = elem;
            elem.querySelector("img,video")?.setAttribute("draggable", "false");
            if (instance.props.animated) {
                originalVideoElementRef.current = elem!.querySelector("video")!;
                originalVideoElementRef.current.addEventListener("timeupdate", syncVideos);
            }

            setReady(true);
        });

        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("keyup", onKeyUp);
        document.addEventListener("mousemove", updateMousePosition);
        document.addEventListener("mousedown", onMouseDown);
        document.addEventListener("mouseup", onMouseUp);
        document.addEventListener("wheel", onWheel);

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("keyup", onKeyUp);
            document.removeEventListener("mousemove", updateMousePosition);
            document.removeEventListener("mousedown", onMouseDown);
            document.removeEventListener("mouseup", onMouseUp);
            document.removeEventListener("wheel", onWheel);
        };
    }, []);

    useLayoutEffect(() => () => {
        if (settings.store.saveZoomValues) {
            settings.store.zoom = zoom.current;
            settings.store.size = size.current;
        }
    });

    if (!ready) return null;

    const box = element.current?.getBoundingClientRect();

    if (!box) return null;

    return (
        <div
            className={cl("lens", { "nearest-neighbor": settings.store.nearestNeighbour, square: settings.store.square })}
            style={{
                opacity,
                width: size.current + "px",
                height: size.current + "px",
                transform: `translate(${lensPosition.x}px, ${lensPosition.y}px)`,
            }}
        >
            {instance.props.animated ?
                (
                    <video
                        ref={currentVideoElementRef}
                        style={{
                            position: "absolute",
                            left: `${imagePosition.x}px`,
                            top: `${imagePosition.y}px`
                        }}
                        width={`${box.width * zoom.current}px`}
                        height={`${box.height * zoom.current}px`}
                        poster={instance.props.src}
                        src={originalVideoElementRef.current?.src ?? instance.props.src}
                        autoPlay
                        loop
                        muted
                    />
                ) : (
                    <img
                        className={cl("image")}
                        ref={imageRef}
                        style={{
                            position: "absolute",
                            transform: `translate(${imagePosition.x}px, ${imagePosition.y}px)`
                        }}
                        width={`${box.width * zoom.current}px`}
                        height={`${box.height * zoom.current}px`}
                        src={instance.props.src}
                        alt=""
                    />
                )}
        </div>
    );
}, { noop: true });
