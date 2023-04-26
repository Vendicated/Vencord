export function StickerCategory(props: {
    children: JSX.Element | JSX.Element[],
    style?: React.CSSProperties;
}) {
    return (
        <div style={{
            ...props.style,
            borderRadius: '4px',
            color: 'var(--interactive-normal)',
            cursor: 'pointer',
            height: '32px',
            marginBottom: '8px',
            width: '32px'
        }}
            role="button"
            tabIndex={0}
        >
            {props.children}
        </div>
    );
}