import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "ApiNotices",
    description: "Fixes notices being automatically dismissed",
    authors: [Devs.Ven],
    required: true,
    patches: [
        {
            find: "updateNotice:",
            replacement: [
                {
                    match: /;(.{1,2}=null;)(?=.{0,50}updateNotice)/g,
                    replace:
                        ";if(Vencord.Api.Notices.currentNotice)return !1;$1"
                },
                {
                    match: /(?<=NOTICE_DISMISS:function.+?){(?=if\(null==(.+?)\))/,
                    replace: '{if($1?.id=="VencordNotice")return ($1=null,Vencord.Api.Notices.nextNotice(),true);'
                }
            ]
        }
    ],
});
