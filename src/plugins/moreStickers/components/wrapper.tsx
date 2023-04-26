export function Wrapper(props: { children: JSX.Element | JSX.Element[]; }) {
    return (
        <div style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: '48px auto',
            gridTemplateRows: 'auto 1fr auto',
        }}>
            {props.children}
        </div>
    );
}