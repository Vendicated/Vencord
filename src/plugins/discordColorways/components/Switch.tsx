export default function ({
    onChange,
    value,
    id,
    label
}: {
    id?: string,
    value: boolean,
    label?: string,
    onChange: (checked: boolean) => void;
}) {
    return label ? <div style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        alignItems: "center",
        cursor: "pointer"
    }}>
        <label className="colorwaySwitch-label" htmlFor={id}>{label}</label>
        <div className={`colorwaysSettings-switch ${value ? "checked" : ""}`}>
            <svg viewBox="0 0 28 20" preserveAspectRatio="xMinYMid meet" aria-hidden="true" style={{
                left: value ? "12px" : "-3px",
                transition: ".2s ease",
                display: "block",
                position: "absolute",
                width: "28px",
                height: "18px",
                margin: "3px"
            }}>
                <rect className="colorwaysSettings-switchCircle" fill="#000" x="4" y="0" height="20" width="20" rx="10" />
            </svg>
            <input checked={value} id={id} type="checkbox" style={{
                position: "absolute",
                opacity: 0,
                width: "100%",
                height: "100%",
                cursor: "pointer",
                borderRadius: "14px",
                top: 0,
                left: 0,
                margin: 0
            }} tabIndex={0} onChange={e => {
                onChange(e.currentTarget.checked);
            }} />
        </div>
    </div> : <div className={`colorwaysSettings-switch ${value ? "checked" : ""}`}>
        <svg viewBox="0 0 28 20" preserveAspectRatio="xMinYMid meet" aria-hidden="true" style={{
            left: value ? "12px" : "-3px",
            transition: ".2s ease",
            display: "block",
            position: "absolute",
            width: "28px",
            height: "18px",
            margin: "3px"
        }}>
            <rect className="colorwaysSettings-switchCircle" fill="#000" x="4" y="0" height="20" width="20" rx="10" />
        </svg>
        <input checked={value} id={id} type="checkbox" style={{
            position: "absolute",
            opacity: 0,
            width: "100%",
            height: "100%",
            cursor: "pointer",
            borderRadius: "14px",
            top: 0,
            left: 0,
            margin: 0
        }} tabIndex={0} onChange={e => {
            onChange(e.currentTarget.checked);
        }} />
    </div>;
}
