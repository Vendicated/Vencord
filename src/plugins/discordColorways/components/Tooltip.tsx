import { useRef, useState, useEffect } from "..";

export default function ({
    children,
    text,
    position = "top"
}: {
    children: (props: { onMouseEnter: () => void; onMouseLeave: () => void; onClick: () => void; }) => JSX.Element,
    text: JSX.Element,
    position?: "top" | "bottom" | "left" | "right";
}) {
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const btn = useRef(null);

    function showTooltip() {
        setPos({
            x: (btn.current as unknown as HTMLElement).children[0].getBoundingClientRect().x + ((btn.current as unknown as HTMLElement).children[0] as HTMLElement).offsetWidth + 8,
            y: (btn.current as unknown as HTMLElement).children[0].getBoundingClientRect().y
        });
        setVisible(true);
    }

    function onWindowUnfocused(e) {
        e = e ? e : window.event;
        var from = e.relatedTarget || e.toElement;
        if (!from || from.nodeName == "HTML") {
            setVisible(false);
        }
    }

    useEffect(() => {
        document.addEventListener("mouseout", onWindowUnfocused);
        return () => {
            document.removeEventListener("mouseout", onWindowUnfocused);
        };
    }, []);

    return <>
        <div ref={btn} style={{
            display: "contents"
        }}>
            {children({
                onMouseEnter: () => showTooltip(),
                onMouseLeave: () => setVisible(false),
                onClick: () => setVisible(false)
            })}
        </div>
        <div className={`colorwaysTooltip colorwaysTooltip-${position} ${!visible ? "colorwaysTooltip-hidden" : ""}`} style={{
            top: `${pos.y}px`,
            left: `${pos.x}px`
        }}>
            <div className="colorwaysTooltipPointer" />
            <div className="colorwaysTooltipContent">{text}</div>
        </div>
    </>;
}
