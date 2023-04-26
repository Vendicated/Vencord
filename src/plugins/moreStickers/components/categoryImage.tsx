import './categoryImage.css';

export function CategoryImage(props: { src: string; alt?: string; isActive?: boolean; }) {
    return (<div>
        <svg width={32} height={32} style={{
            display: 'block',
            contain: 'paint',
            overflow: 'hidden',
            overflowClipMargin: 'content-box',
        }}>
            <foreignObject x={0} y={0} width={32} height={32} overflow="visible"
                mask={
                    props?.isActive ? "url(#svg-mask-squircle)" : "url(#svg-mask-avatar-default)"
                }>
                <img src={props.src} alt={props.alt} width={32} height={32} style={{
                    textIndent: '-9999px',
                    alignItems: 'center',
                    backgroundColor: 'var(--background-primary)',
                    color: 'var(--text-normal)',
                    display: 'flex',
                    height: '100%',
                    justifyContent: 'center',
                    width: '100%'
                }} />
            </foreignObject>
        </svg>
    </div>);
}