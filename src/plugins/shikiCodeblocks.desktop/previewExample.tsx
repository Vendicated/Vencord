/* eslint-disable simple-header/header */

import type { FC } from "react";

async function handleClick() {
    (await import("@webpack/common")).ClipboardUtils.copy("\u200b");
}

export const Example: FC<{
    real: boolean,
    shigged?: number,
}> = ({ real, shigged }) => (
    <>
        <p>{`Shigg${real ? `ies${shigged === 0x1B ? "t" : ""}` : "y"}`}</p>
        <button onClick={handleClick}>Click Me</button>
    </>
);
