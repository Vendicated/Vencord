import { classNameFactory } from "@api/Styles";
import { cl } from "../index";

import { Text } from "@webpack/common";

export function InfoWithIcon(props)
{
    const {svg, children} = props;
    return (
        <div className={cl("infowithicon")}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d={svg}/></svg>
            <Text color="header-primary" variant="heading-md/semibold">{children}</Text>
        </div>
    )
}
