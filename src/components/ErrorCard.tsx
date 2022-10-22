import { Card } from "../webpack/common";

interface Props {
    style?: React.CSSProperties;
    className?: string;
}
export function ErrorCard(props: React.PropsWithChildren<Props>) {
    return (
        <Card className={props.className} style={
            {
                padding: "2em",
                backgroundColor: "#e7828430",
                borderColor: "#e78284",
                color: "var(--text-normal)",
                ...props.style
            }
        }>
            {props.children}
        </Card>
    );
}
