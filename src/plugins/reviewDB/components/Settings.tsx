/*
import { authorize } from "../Utils/Utils";
import { filters, findByProps } from "../../../webpack";
import { Settings } from "../../../Vencord";
import { Button, React, Switch, Text, TextInput } from "../../../webpack/common";
import { lazyWebpack } from "../../../utils";

const { FormDivider } = lazyWebpack(filters.byProps(["FormDivider"]))
const settings = Settings.plugins.ReviewDB




export default function ReviewDBSettings(): JSX.Element {
    const [switchValue, setSwitchValue] = React.useState(settings.notifyReviews)
    const [oauth2token, setOauth2token] = React.useState(settings.token)
    return (<>

        <Switch value={switchValue} onChange={(val) => {
            settings.notifyReviews = val;
            setSwitchValue(val);
        }} >Notify New Reviews</Switch>

        <Text style={{ marginBottom: 4, marginLeft: 2 }} variant={"code"}>OAUTH2 Token</Text>
        <TextInput style={{ marginBottom: 8 }} value={oauth2token} placeholder="Login to get token" onChange={(val) => {
            settings.token = val
            setOauth2token(val)
            return true;
        }} />

        <Button onClick={() => authorize(() => setOauth2token(settings.token))}>Login</Button>
        <FormDivider style={{ marginTop: 12 }} />

        <Text style={{ marginTop: 8, marginBottom: 4 }} variant={"code"}>If Login Button is not working</Text>


    </>)
}
*/