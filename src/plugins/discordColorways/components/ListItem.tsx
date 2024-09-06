import { useEffect, useRef, useState } from "..";
import Tooltip from "./Tooltip";

export default function ({
    children,
    tooltip,
    hasPill = false
}: {
    children: (props: { onMouseEnter: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void; onMouseLeave: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void; isActive: (e: boolean) => void, onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void; }) => JSX.Element,
    tooltip?: JSX.Element,
    hasPill?: boolean;
}) {
    const [status, setStatus] = useState("none");
    const btn = useRef(null);

    function onWindowUnfocused(e) {
        e = e ? e : window.event;
        var from = e.relatedTarget || e.toElement;
        if (!from || from.nodeName == "HTML") {
            setStatus("none");
        }
    }

    useEffect(() => {
        document.addEventListener("mouseout", () => onWindowUnfocused);
        return () => {
            document.removeEventListener("mouseout", onWindowUnfocused);
        };
    }, []);

    return tooltip ? <Tooltip text={tooltip} position="right">
        {({ onMouseEnter, onMouseLeave, onClick }) => {
            return <div ref={btn} className="colorwaysServerListItem">
                {hasPill ? <div className="colorwaysServerListItemPill" data-status={status} /> : <></>}
                {children({
                    onMouseEnter: (e) => {
                        onMouseEnter({ currentTarget: btn.current } as unknown as React.MouseEvent<HTMLDivElement, MouseEvent>);
                        status !== "active" ? setStatus("hover") : void 0;
                    },
                    onMouseLeave: (e) => {
                        onMouseLeave(e);
                        status !== "active" ? setStatus("none") : void 0;
                    },
                    isActive: (stat) => setStatus(stat ? "active" : "none"),
                    onClick: onClick
                })}
            </div>;
        }}
    </Tooltip> : <div className="colorwaysServerListItem">
        {hasPill ? <div className="colorwaysServerListItemPill" data-status={status} /> : <></>}
        {children({
            onMouseEnter: () => status !== "active" ? setStatus("hover") : void 0,
            onMouseLeave: () => status !== "active" ? setStatus("none") : void 0,
            isActive: (stat) => setStatus(stat ? "active" : "none"),
            onClick: () => { }
        })}
    </div>;
}
