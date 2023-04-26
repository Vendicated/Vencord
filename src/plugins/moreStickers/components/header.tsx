export function Header(props: { children: JSX.Element | JSX.Element[]; }) {
    return (
        <div style={{
            boxShadow: 'var(--elevation-low)',
            gridColumn: '1/3',
            gridRow: '1/2',
            minHeight: '1px',
            zIndex: '1',
            padding: '0 16px 16px',
            display: 'flex',
            alignItems: 'center',
        }}>
            {props.children}
        </div>
    );
}