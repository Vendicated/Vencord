import { React } from "../webpack/common";

interface Props {
    href: string;
    disabled?: boolean;
    style?: React.CSSProperties;
}

export function Link(props: React.PropsWithChildren<Props>) {
    if (props.disabled) {
        props.style ??= {};
        props.style.pointerEvents = "none";
    }
    return (
        <a href={props.href} target="_blank" style={props.style}>
            {props.children}
        </a>
    );
}
