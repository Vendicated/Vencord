
export function IconContainer(props: { children: JSX.Element | JSX.Element[]; }) {
    return (
        <div style={{
            width: '20px',
            height: '20px',
            boxSizing: 'border-box',
            position: 'relative',
            cursor: 'text'
        }}>
            {props.children}
        </div>
    );
}