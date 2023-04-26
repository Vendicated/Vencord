import './categoryScroller.css';

export function CategoryScroller(props: { children: JSX.Element | JSX.Element[]; }) {
    const children = Array.isArray(props.children) ? props.children : [props.children];
    return (
        <div className="categoryScroller" style={{
            overflow: 'hidden scroll',
            paddingRight: '0',
            height: '100%',
            position: 'relative',
            boxSizing: 'border-box',
            minHeight: '0',
            flex: '1 1 auto',
        }}>
            <div style={{
                inset: '8px',
                contain: 'layout',
                position: 'absolute'
            }}>
                {
                    children.map(child => (
                        <div role="listitem" aria-setsize={children.length} aria-posinset={0}>
                            {child}
                        </div>
                    ))
                }
            </div>
            <div style={{
                height: '1753px'
            }}></div>
            <div aria-hidden="true" style={{
                position: 'absolute',
                pointerEvents: 'none',
                minHeight: 0,
                minWidth: '1px',
                flex: '0 0 auto',
                height: 0
            }}></div>
        </div>
    );
}