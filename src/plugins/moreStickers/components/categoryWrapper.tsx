export function CategoryWrapper(props: { children: JSX.Element | JSX.Element[]; }) {
    return (
        <div style={{
            top: "50px",
            backgroundColor: 'var(--background-tertiary)',
            position: 'absolute',
            right: '0',
            left: '0',
            overflow: 'hidden',
            width: '48px',
        }}>
            {props.children}
        </div>
    );
}