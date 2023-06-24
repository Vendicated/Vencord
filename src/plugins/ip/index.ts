import definePlugin from "@utils/types";
import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage, sendMessage } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { Button, ButtonLooks, ButtonWrapperClasses, FluxDispatcher, React, Tooltip } from "@webpack/common";

function formatMessage(data: any, query: string): { content: string } {
  const message = {
    URL: query,
    IP: data.ip,
    "IPv4/IPv6": data.type,
    Organization: data.org,
    "Service Provider": data.isp,
    Continent: data.country,
    "Country Capital": data.country_capital,
    City: data.city,
    Region: data.region,
    "Country Phone": data.country_phone,
    Timezone: data.timezone,
    Currency: data.currency,
  };
  const messageString = JSON.stringify(message, null, 2);
  return {
    content: `\`\`\`json\n${messageString}\n\`\`\``,
  };
}

export default definePlugin({
    name: "IP",
    description: "Get details about IPv4/IPv6 address or a domain name.",
    authors: [
        {
            id: 393059037652058112n,
            name: "madonchik123",
        },
    ],
    patches: [],
	dependencies: ["CommandsAPI"],
	commands: [{
        name: "ip",
        description: "Retrieves all information about the ip address you gave.",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
			{
                name: "query",
                description: "Enter IPv4/IPv6 address or domain name",
                required: true,
                type: ApplicationCommandOptionType.STRING,
            }
        ],
        execute: async (_, ctx) => {
			const query = findOption(_, "query", "");
            const response = await fetch("https://ipwhois.app/json/" + query);
			const data = await response.json();
			return await sendBotMessage(ctx.channel.id, {
                    embeds: [
                        {
						  "type": "rich",
						  "title": query,
						  "description": "",
						  "color": "0x0x8663BE",
						  "fields": [
							{
							  "name": `IP`,
							  "value": data.ip,
							  "inline": true
							},
							{
							  "name": `IPv4/IPv6`,
							  "value": data.type,
							  "inline": true
							},
							{
							  "name": `Organization`,
							  "value": data.org,
							  "inline": true
							},
							{
							  "name": `Service Provider`,
							  "value": data.isp,
							  "inline": true
							},
							{
							  "name": `Continent`,
							  "value": data.country,
							  "inline": true
							},
							{
							  "name": `Country Capital`,
							  "value": data.country_capital,
							  "inline": true
							},
							{
							  "name": `City`,
							  "value": data.city,
							  "inline": true
							},
							{
							  "name": `Region`,
							  "value": data.region,
							  "inline": true
							},
							{
							  "name": `Country Phone`,
							  "value": data.country_phone,
							  "inline": true
							},
							{
							  "name": `Timezone`,
							  "value": data.timezone,
							  "inline": true
							},
							{
							  "name": `Currency`,
							  "value": data.currency,
							  "inline": true
							}
						  ],
						  "url": query,
						  "footer": {
							"text": `Powered by the ipwhois`
						  },
						}
                    ]
                });
        },
    }],
});
