import { PropsWithChildren } from "react";
import type { React } from '../webpack/common';

export function Flex(props: React.PropsWithChildren<{
    flexDirection?: React.CSSProperties["flexDirection"];
    style?: React.CSSProperties;
    className?: string;
}>) {
    props.style ??= {};
    props.style.flexDirection ||= props.flexDirection;
    props.style.gap ??= "1em";
    props.style.display = "flex";
    return (
        <div {...props}>
            {props.children}
        </div>
    );
}
