import { useState } from "..";

export default function ({
    items = []
}: {
    items: { name: string, component: () => JSX.Element; }[];
}) {
    const [active, setActive] = useState(items[0].name);
    return <>
        <div className="colorwaysMenuTabs">
            {items.map(item => {
                return <div className={`colorwaysMenuTab ${active == item.name ? "active" : ""}`} onClick={() => {
                    setActive(item.name);
                }}>{item.name}</div>;
            })}
        </div>
        {items.map(item => {
            const Component = item.component;
            return active == item.name ? <Component /> : null;
        })}
    </>;
}
