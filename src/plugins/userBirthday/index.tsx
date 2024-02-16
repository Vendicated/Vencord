/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
  ApplicationCommandInputType,
  ApplicationCommandOptionType,
  findOption,
  sendBotMessage,
} from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { showNotification } from "@api/Notifications";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { NavigationRouter, UserUtils } from "@webpack/common";
import { Settings } from "Vencord";

const EMOTE = "<:luna:1035316192220553236>";
const DATA_KEY = "UserBirthday_BIRTHDAYS";

interface Birthday {
  user: bigint;
  date: Date;
  wished: boolean;
}

const getBirthdays = () =>
  DataStore.get(DATA_KEY).then<Birthday[]>(t => t ?? []);
const getBirthday = (user: bigint) =>
  DataStore.get(DATA_KEY).then<Birthday | null>(
    (t: Birthday[]) =>
      (t ?? []).find((tt: Birthday) => tt.user === user) ?? null
  );
const addBirthday = async (tag: Birthday) => {
  const birthdays = await getBirthdays();
  birthdays.push(tag);
  DataStore.set(DATA_KEY, birthdays);
  return birthdays;
};
const removeBirthday = async (user: bigint) => {
  let birthdays = await getBirthdays();
  birthdays = await birthdays.filter((t: Birthday) => t.user !== user);
  DataStore.set(DATA_KEY, birthdays);
  return birthdays;
};

const birthdaysPending: any = [];

const convertBirthday = (date: string) => {
  const customFormat = Settings.plugins.UserBirthday.dateFormat;
  const escapedFormat = customFormat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const regexPattern = escapedFormat
    .replace("YYYY", "(\\d{4})")
    .replace("MM", "(\\d{2})")
    .replace("DD", "(\\d{2})");
  const regex = new RegExp(regexPattern);
  const match = date.match(regex);

  if (match) {
    // Extract year, month, and day from the matched groups based on the format
    let year, month, day;
    if (customFormat.indexOf("YYYY") < customFormat.indexOf("MM")) {
      year = match[1];
      month = match[2];
      day = match[3];
    } else if (customFormat.indexOf("MM") < customFormat.indexOf("DD")) {
      month = match[1];
      day = match[2];
      year = match[3];
    } else {
      day = match[1];
      month = match[2];
      year = match[3];
    }
    year = parseInt(year);
    month = parseInt(month);
    month -= 1;
    day = parseInt(day);

    if (month >= 0 && month <= 11 && day > 0 && day <= 31) {
      return new Date(year, month, day); // Return formatted date
    } else {
      return null;
    }
  } else {
    return null;
  }
};

const formatDateToString = (date: Date) => {
  const customFormat = Settings.plugins.UserBirthday.dateFormat;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());

  return customFormat
    .replace("DD", day)
    .replace("MM", month)
    .replace("YYYY", year);
};

const handleBirthdays = async () => {
  await handlingBirthdays();
  setTimeout(handleBirthdays, 1000 * 60 * 60);
};

const handlingBirthdays = async () => {
  const birthdays = await getBirthdays();
  if (birthdays.length === 0) return;
  for await (const b of birthdays) {
    const birthdayDate = new Date(b.date);
    const currentDay = new Date();
    birthdayDate.setFullYear(currentDay.getFullYear());

    const isBirthday =
      birthdayDate.getDate() === currentDay.getDate() &&
      birthdayDate.getMonth() === currentDay.getMonth() &&
      birthdayDate.getFullYear() === currentDay.getFullYear();

    if (isBirthday && !b.wished) {
      await removeBirthday(b.user);
      await addBirthday({ ...b, wished: true });
      try {
        const user = await UserUtils.getUser(b.user.toString());
        const name = user.globalName || user.username;
        birthdaysPending.push(function () {
          showNotification({
            title: `${name} has birthday today!`,
            body: "Click here to wish them a happy birthday",
            permanent: true,
            noPersist: true,
            onClick() {
              NavigationRouter.transitionTo(
                "/users/" + b.user.toString()
              );
            },
            onClose() {
              if (birthdaysPending.length > 0) {
                setTimeout(() => {
                  birthdaysPending.shift()();
                }, 1500);
              }
            },
          });
        });
      } catch (e) {
        birthdaysPending.push(function () {
          showNotification({
            title: "A friend has birthday today!",
            body: "Click here to wish them a happy birthday",
            permanent: true,
            noPersist: true,
            onClick() {
              NavigationRouter.transitionTo(
                "/users/" + b.user.toString()
              );
            },
            onClose() {
              if (birthdaysPending.length > 0) {
                setTimeout(() => {
                  birthdaysPending.shift()();
                }, 1500);
              }
            },
          });
        });
      }
    } else if (b.wished && !isBirthday) {
      await removeBirthday(b.user);
      await addBirthday({ ...b, wished: false });
    }
  }
  if (birthdaysPending.length > 0) {
    birthdaysPending.shift()();
  }
};

export default definePlugin({
  name: "UserBirthday",
  description: "Notifies you when someone's birthday is coming up.",
  authors: [Devs.damsdev],
  dependencies: ["CommandsAPI"],
  options: {
    dateFormat: {
      name: "Date format for birthdays",
      description:
        "The date will be parsed with the given format (the format needs to have YYYY, MM and DD, for example DD/MM/YYYY)",
      type: OptionType.STRING,
      default: "YYYY-MM-DD",
      restartNeeded: true,
    },
  },
  async start() {
    await handleBirthdays();
  },

  commands: [
    {
      name: "birthday",
      description: "Manage birthday of users",
      inputType: ApplicationCommandInputType.BUILT_IN,
      options: [
        {
          name: "create",
          description: "Create a new tag",
          type: ApplicationCommandOptionType.SUB_COMMAND,
          options: [
            {
              name: "date",
              description: `The date of the birthday (Format: ${Settings.plugins.UserBirthday.dateFormat})`,
              type: ApplicationCommandOptionType.STRING,
              required: true,
            },
            {
              name: "user",
              description: "The user to wish the birthday to",
              type: ApplicationCommandOptionType.USER,
              required: false,
            },
          ],
        },
        {
          name: "list",
          description: "List all tags from yourself",
          type: ApplicationCommandOptionType.SUB_COMMAND,
          options: [],
        },
        {
          name: "delete",
          description: "Remove birthday",
          type: ApplicationCommandOptionType.SUB_COMMAND,
          options: [
            {
              name: "user",
              description: "The user to remove birthday",
              type: ApplicationCommandOptionType.USER,
              required: false,
            },
          ],
        },
      ],

      async execute(args, ctx) {
        switch (args[0].name) {
          case "create": {
            let user;
            const birthdayDate: string = findOption(
              args[0].options,
              "date",
              null
            );
            const userOption: bigint = findOption(
              args[0].options,
              "user",
              null
            );

            user = userOption;

            if (!user) {
              if (!ctx.channel.isDM()) {
                return sendBotMessage(ctx.channel.id, {
                  content: `${EMOTE} Not in DM, you need to specify a user !`,
                });
              }

              user = ctx.channel.recipients[0];
            }

            if (!birthdayDate) {
              return sendBotMessage(ctx.channel.id, {
                content: `${EMOTE} Invalid date!`,
              });
            }

            const date = convertBirthday(birthdayDate);
            if (!date) {
              return sendBotMessage(ctx.channel.id, {
                content: `${EMOTE} Invalid date!`,
              });
            }
            const birthday = {
              user,
              date,
              wished: false,
            };
            await removeBirthday(user);
            await addBirthday(birthday);
            sendBotMessage(ctx.channel.id, {
              content: `${EMOTE} Birthday created ! <@${birthday.user
                }>: <t:${birthday.date.getTime() / 1000}:d>, `,
            });
            break; // end 'create'
          }
          case "delete": {
            let user;
            const userOption: bigint = findOption(
              args[0].options,
              "user",
              null
            );

            user = userOption;
            if (!user) {
              if (!ctx.channel.isDM()) {
                return sendBotMessage(ctx.channel.id, {
                  content: `${EMOTE} Not in DM, you need to specify a user !`,
                });
              }

              user = ctx.channel.recipients[0];
            }

            await removeBirthday(user);
            sendBotMessage(ctx.channel.id, {
              content: `${EMOTE} Birthday of <@${user}> deleted !`,
            });
            break; // end 'delete'
          }
          case "list": {
            sendBotMessage(ctx.channel.id, {
              embeds: [
                {
                  // @ts-ignore
                  title: "All Birthdays:",
                  // @ts-ignore
                  description:
                    (await getBirthdays())
                      .map(
                        birthday =>
                          `<@${birthday.user}>: <t:${birthday.date.getTime() /
                          1000
                          }:d>, <t:${birthday.date.getTime() /
                          1000
                          }:R>`
                      )
                      .join("\n") ||
                    `${EMOTE} Woops! There are no birthdays yet, use \`/birthday create\` to create one!`,
                  // @ts-ignore
                  color: 0xd77f7f,
                  type: "rich",
                },
              ],
            });
            break; // end 'list'
          }

          default: {
            sendBotMessage(ctx.channel.id, {
              content: "Invalid sub-command",
            });
            break;
          }
        }
      },
    },
  ],
});
