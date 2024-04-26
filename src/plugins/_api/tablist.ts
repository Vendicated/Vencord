import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";


export default definePlugin({
    name: "TablistApi",
    description: "API to add panels to the expression picker",
    authors: [Devs.iamme],
    patches: [
        {
            find: ".EXPRESSION_PICKER_CATEGORIES_A11Y_LABEL",
            replacement: [
                {
                    match: /\.jsx)\((\i),\{id:\i\.\i,.+?,"aria-selected":(\i)===.+?,viewType:(\i).+?\}\)/,//\]
                    replace: "$&,...Vencord.Api.Tablist.RenderButtons($1, $2, $3)"
                },
                {
                    match: /null,(\i)===(\i)\.ExpressionPickerViewType\.EMOJI\?.{0,55}channel:(\i),.+?\):null/,
                    replace: "$&,...Vencord.Api.Tablist.TabPanels($1, $2, $3)"
                }
            ]
        }
    ]
});
