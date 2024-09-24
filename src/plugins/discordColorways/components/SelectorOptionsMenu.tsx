/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MouseEvent, MouseEventHandler } from "react";

import { DataStore, useEffect, useState } from "..";
import { ColorwayCSS } from "../colorwaysAPI";
import { generateCss, getAutoPresets, getPreset, gradientBase, gradientPresetIds } from "../css";
import { ColorwayObject, SortOptions } from "../types";
import { colorToHex } from "../utils";
import { hasManagerRole, sendColorway, wsOpen } from "../wsClient";
import { CaretIcon, CogIcon } from "./Icons";

export default function ({ sort, onSortChange, source, sources, onSourceChange, onAutoPreset }: { sort: SortOptions, onSortChange: (newSort: SortOptions) => void; source: { name: string, id: string; }, sources: { name: string, id: string; }[], onSourceChange: (sourceId: string) => void; onAutoPreset: (autoPresetId: string) => void; }) {
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [subPos, setSubPos] = useState({ x: 0, y: 0 });
    const [showMenu, setShowMenu] = useState(false);
    const [showSort, setShowSort] = useState(false);
    const [showSources, setShowSources] = useState(false);
    const [showPresets, setShowPresets] = useState(false);
    const [showAutoPresets, setShowAutoPresets] = useState(false);
    const [preset, setPreset] = useState("default");
    const [current, setCurrent] = useState(source);
    const [autoColorwayId, setAutoColorwayId] = useState("");

    function rightClickContextMenu(e: MouseEvent<HTMLButtonElement, MouseEvent>) {
        e.stopPropagation();
        window.dispatchEvent(new Event("click"));
        setShowMenu(!showMenu);
        setPos({
            x: e.currentTarget.getBoundingClientRect().x,
            y: e.currentTarget.getBoundingClientRect().y + e.currentTarget.offsetHeight + 8
        });

        return;
    }

    function onPageClick(this: Window, e: globalThis.MouseEvent) {
        setShowMenu(false);
    }

    useEffect(() => {
        (async () => {
            setPreset(await DataStore.get("colorwaysPreset") as string);
            setAutoColorwayId(await DataStore.get("activeAutoPreset") as string);
        })();
        window.addEventListener("click", onPageClick);
        return () => {
            window.removeEventListener("click", onPageClick);
        };
    }, []);

    function onSortChange_internal(newSort: SortOptions) {
        onSortChange(newSort);
        setShowMenu(false);
    }

    function onSourceChange_internal(newSort: { name: string, id: string; }) {
        onSourceChange(newSort.id);
        setCurrent(newSort);
        setShowMenu(false);
    }

    function onPresetChange(value: string) {
        setPreset(value);
        DataStore.set("colorwaysPreset", value);

        DataStore.get("activeColorwayObject").then((active: ColorwayObject) => {
            if (active.id) {
                if (wsOpen) {
                    if (hasManagerRole) {
                        sendColorway(active);
                    }
                } else {
                    if (value === "default") {
                        ColorwayCSS.set(generateCss(
                            active.colors,
                            true,
                            true,
                            undefined,
                            active.id
                        ));
                    } else {
                        if (gradientPresetIds.includes(value)) {
                            const css = Object.keys(active).includes("linearGradient")
                                ? gradientBase(colorToHex(active.colors.accent), true) + `:root:root {--custom-theme-background: linear-gradient(${active.linearGradient})}`
                                : (getPreset(active.colors)[value].preset as { full: string; }).full;
                            ColorwayCSS.set(css);
                        } else {
                            ColorwayCSS.set(getPreset(active.colors)[value].preset as string);
                        }
                    }
                }
            }
        });
        setShowMenu(false);
    }

    function onAutoPresetChange(activeAutoPreset: string) {
        onAutoPreset(activeAutoPreset);
        setShowMenu(false);
    }

    return <>
        {showMenu ? <nav className="colorwaysContextMenu" style={{
            position: "fixed",
            top: `${pos.y}px`,
            left: `${pos.x}px`
        }}>
            <button className="colorwaysContextMenuItm" onMouseEnter={e => {
                setShowSort(true);
                setSubPos({
                    x: e.currentTarget.getBoundingClientRect().x + e.currentTarget.offsetWidth,
                    y: e.currentTarget.getBoundingClientRect().y
                });
            }} onMouseLeave={e => {
                const elem = document.elementFromPoint(e.clientX, e.clientY);
                if (elem !== e.currentTarget) {
                    setShowSort(false);
                }
            }}>
                Sort by: {(() => {
                    switch (sort) {
                        case 1:
                            return "Name (A-Z)";
                        case 2:
                            return "Name (Z-A)";
                        case 3:
                            return "Source (A-Z)";
                        case 4:
                            return "source (Z-A)";
                        default:
                            return "Name (A-Z)";
                    }
                })()}
                <div className="colorwaysCaretContainer">
                    <CaretIcon width={16} height={16} />
                </div>
                {showSort ? <div className="colorwaysSubmenuWrapper" style={{
                    position: "fixed",
                    top: `${subPos.y}px`,
                    left: `${subPos.x}px`
                }}>
                    <nav className="colorwaysContextMenu">
                        <button onClick={() => onSortChange_internal(1)} className="colorwaysContextMenuItm">
                            Name (A-Z)
                            <svg aria-hidden="true" role="img" width="18" height="18" viewBox="0 0 24 24" style={{
                                marginLeft: "8px"
                            }}>
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                                {sort === 1 ? <circle className="colorwaysRadioSelected" cx="12" cy="12" r="5" /> : null}
                            </svg>
                        </button>
                        <button onClick={() => onSortChange_internal(2)} className="colorwaysContextMenuItm">
                            Name (Z-A)
                            <svg aria-hidden="true" role="img" width="18" height="18" viewBox="0 0 24 24" style={{
                                marginLeft: "8px"
                            }}>
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                                {sort === 2 ? <circle className="colorwaysRadioSelected" cx="12" cy="12" r="5" /> : null}
                            </svg>
                        </button>
                        <button onClick={() => onSortChange_internal(3)} className="colorwaysContextMenuItm">
                            Source (A-Z)
                            <svg aria-hidden="true" role="img" width="18" height="18" viewBox="0 0 24 24" style={{
                                marginLeft: "8px"
                            }}>
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                                {sort === 3 ? <circle className="colorwaysRadioSelected" cx="12" cy="12" r="5" /> : null}
                            </svg>
                        </button>
                        <button onClick={() => onSortChange_internal(4)} className="colorwaysContextMenuItm">
                            Source (Z-A)
                            <svg aria-hidden="true" role="img" width="18" height="18" viewBox="0 0 24 24" style={{
                                marginLeft: "8px"
                            }}>
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                                {sort === 4 ? <circle className="colorwaysRadioSelected" cx="12" cy="12" r="5" /> : null}
                            </svg>
                        </button>
                    </nav>
                </div> : <></>}
            </button>
            <button className="colorwaysContextMenuItm" onMouseEnter={e => {
                setShowPresets(true);
                setSubPos({
                    x: e.currentTarget.getBoundingClientRect().x + e.currentTarget.offsetWidth,
                    y: e.currentTarget.getBoundingClientRect().y
                });
            }} onMouseLeave={e => {
                const elem = document.elementFromPoint(e.clientX, e.clientY);
                if (elem !== e.currentTarget) {
                    setShowPresets(false);
                }
            }}>
                Preset: {Object.values(getPreset({})).find(pr => pr.id === preset)?.name}
                <div className="colorwaysCaretContainer">
                    <CaretIcon width={16} height={16} />
                </div>
                {showPresets ? <div className="colorwaysSubmenuWrapper" style={{
                    position: "fixed",
                    top: `${subPos.y}px`,
                    left: `${subPos.x}px`
                }}>
                    <nav className="colorwaysContextMenu">
                        {Object.values(getPreset({})).map(({ name, id }) => {
                            return <button onClick={() => onPresetChange(id)} className="colorwaysContextMenuItm">
                                {name}
                                <svg aria-hidden="true" role="img" width="18" height="18" viewBox="0 0 24 24" style={{
                                    marginLeft: "8px"
                                }}>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                                    {preset === id ? <circle className="colorwaysRadioSelected" cx="12" cy="12" r="5" /> : null}
                                </svg>
                            </button>;
                        })}
                    </nav>
                </div> : null}
            </button>
            <button className="colorwaysContextMenuItm" onMouseEnter={e => {
                setShowAutoPresets(true);
                setSubPos({
                    x: e.currentTarget.getBoundingClientRect().x + e.currentTarget.offsetWidth,
                    y: e.currentTarget.getBoundingClientRect().y
                });
            }} onMouseLeave={e => {
                const elem = document.elementFromPoint(e.clientX, e.clientY);
                if (elem !== e.currentTarget) {
                    setShowAutoPresets(false);
                }
            }}>
                Auto Colorway Preset: {Object.values(getAutoPresets()).find(pr => pr.id === autoColorwayId)?.name}
                <div className="colorwaysCaretContainer">
                    <CaretIcon width={16} height={16} />
                </div>
                {showAutoPresets ? <div className="colorwaysSubmenuWrapper" style={{
                    position: "fixed",
                    top: `${subPos.y}px`,
                    left: `${subPos.x}px`
                }}>
                    <nav className="colorwaysContextMenu">
                        {Object.values(getAutoPresets()).map(({ name, id }) => {
                            return <button onClick={() => onAutoPresetChange(id)} className="colorwaysContextMenuItm">
                                {name}
                                <svg aria-hidden="true" role="img" width="18" height="18" viewBox="0 0 24 24" style={{
                                    marginLeft: "8px"
                                }}>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                                    {autoColorwayId === id ? <circle className="colorwaysRadioSelected" cx="12" cy="12" r="5" /> : null}
                                </svg>
                            </button>;
                        })}
                    </nav>
                </div> : null}
            </button>
            <button className="colorwaysContextMenuItm" onMouseEnter={e => {
                setShowSources(true);
                setSubPos({
                    x: e.currentTarget.getBoundingClientRect().x + e.currentTarget.offsetWidth,
                    y: e.currentTarget.getBoundingClientRect().y
                });
            }} onMouseLeave={e => {
                const elem = document.elementFromPoint(e.clientX, e.clientY);
                if (elem !== e.currentTarget) {
                    setShowSources(false);
                }
            }}>
                Source: {current.name}
                <div className="colorwaysCaretContainer">
                    <CaretIcon width={16} height={16} />
                </div>
                {showSources ? <div className="colorwaysSubmenuWrapper" style={{
                    position: "fixed",
                    top: `${subPos.y}px`,
                    left: `${subPos.x}px`
                }}>
                    <nav className="colorwaysContextMenu">
                        {sources.map(({ name, id }) => {
                            return <button onClick={() => onSourceChange_internal({ name, id })} className="colorwaysContextMenuItm">
                                {name}
                                <svg aria-hidden="true" role="img" width="18" height="18" viewBox="0 0 24 24" style={{
                                    marginLeft: "8px"
                                }}>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                                    {source.id === id ? <circle className="colorwaysRadioSelected" cx="12" cy="12" r="5" /> : null}
                                </svg>
                            </button>;
                        })}
                    </nav>
                </div> : null}
            </button>
        </nav> : null}
        <button className="colorwaysPillButton" onClick={rightClickContextMenu as unknown as MouseEventHandler<HTMLButtonElement>}><CogIcon width={14} height={14} /> Options...</button>
    </>;
}
