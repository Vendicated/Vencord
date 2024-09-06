import { SortIcon } from "./Icons";
import { useState, useEffect } from "..";
import { SortOptions } from "../types";
import { MouseEvent } from "react";

export default function ({ sort, onSortChange }: { sort: SortOptions, onSortChange: (newSort: SortOptions) => void; }) {
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [showMenu, setShowMenu] = useState(false);

    function rightClickContextMenu(e: MouseEvent<HTMLButtonElement, MouseEvent>) {
        e.stopPropagation();
        window.dispatchEvent(new Event("click"));
        setShowMenu(!showMenu);
        setPos({
            x: e.currentTarget.getBoundingClientRect().x,
            y: e.currentTarget.getBoundingClientRect().y + e.currentTarget.offsetHeight + 8
        });
    }
    function onPageClick(this: Window, e: globalThis.MouseEvent) {
        setShowMenu(false);
    }

    useEffect(() => {
        window.addEventListener("click", onPageClick);
        return () => {
            window.removeEventListener("click", onPageClick);
        };
    }, []);

    function onSortChange_internal(newSort: SortOptions) {
        onSortChange(newSort);
        setShowMenu(false);
    }

    return <>
        {showMenu ? <nav className="colorwaysContextMenu" style={{
            position: "fixed",
            top: `${pos.y}px`,
            left: `${pos.x}px`
        }}>
            <button onClick={() => onSortChange_internal(1)} className="colorwaysContextMenuItm">
                Name (A-Z)
                <svg aria-hidden="true" role="img" width="18" height="18" viewBox="0 0 24 24" style={{
                    marginLeft: "8px"
                }}>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                    {sort == 1 ? <circle className="colorwaysRadioSelected" cx="12" cy="12" r="5" /> : null}
                </svg>
            </button>
            <button onClick={() => onSortChange_internal(2)} className="colorwaysContextMenuItm">
                Name (Z-A)
                <svg aria-hidden="true" role="img" width="18" height="18" viewBox="0 0 24 24" style={{
                    marginLeft: "8px"
                }}>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                    {sort == 2 ? <circle className="colorwaysRadioSelected" cx="12" cy="12" r="5" /> : null}
                </svg>
            </button>
            <button onClick={() => onSortChange_internal(3)} className="colorwaysContextMenuItm">
                Source (A-Z)
                <svg aria-hidden="true" role="img" width="18" height="18" viewBox="0 0 24 24" style={{
                    marginLeft: "8px"
                }}>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                    {sort == 3 ? <circle className="colorwaysRadioSelected" cx="12" cy="12" r="5" /> : null}
                </svg>
            </button>
            <button onClick={() => onSortChange_internal(4)} className="colorwaysContextMenuItm">
                Source (Z-A)
                <svg aria-hidden="true" role="img" width="18" height="18" viewBox="0 0 24 24" style={{
                    marginLeft: "8px"
                }}>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                    {sort == 4 ? <circle className="colorwaysRadioSelected" cx="12" cy="12" r="5" /> : null}
                </svg>
            </button>
        </nav> : null}
        <button className="colorwaysPillButton" onClick={rightClickContextMenu}><SortIcon width={14} height={14} /> Sort By...</button>
    </>;
}
