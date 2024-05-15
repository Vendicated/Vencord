/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// Empty lines and lines starting with # will be ignored
// Leading and trailing spaces will be trimmed
const presetQuotes = `
    Explode
    Read if cute
    Have a nice day!
    Starting Lightcord...
    Loading 0BDFDB.plugin.js...
    Installing BetterDiscord...
    # Hey guys, did you know that in terms of male human and female Pokémon breeding, Vaporeon is the most compatible Pokémon for humans?
    h
    shhhhh did you know that you're my favourite user? But don't tell the others!!
    Today's video is sponsored by Raid Shadow Legends, one of the biggest mobile role-playing games of 2019 and it's totally free!
    Never gonna give you up, Never gonna let you down
    ( ͡° ͜ʖ ͡°)
    (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧
    You look so pretty today!
    Thinking of a funny quote...
    3.141592653589793
    meow
    Welcome, friend
    If you, or someone you love, has Ligma, please see the Ligma health line at https://bit.ly/ligma_hotline
    Trans Rights
    I’d just like to interject for a moment. What you’re refering to as Linux, is in fact, GNU/Linux, or as I’ve recently taken to calling it, GNU plus Linux.
    You're doing good today!
    Don't worry, it's nothing 9 cups of coffee couldn't solve!
    �(repeat like 30 times)
    a light amount of tomfoolery is okay
    do you love?
    horror
    so eepy
    So without further ado, let's just jump right into it!
    Dying is absolutely safe
    hey you! you're cute :))
    heya ~
    <:trolley:997086295010594867>
    Time is gone, space is insane. Here it comes, here again.
    sometimes it's okay to just guhhhhhhhhhhhhhh
    Welcome to nginx!
`.split("\n").map(quote => /^\s*[^#\s]/.test(quote) && quote.trim()).filter(Boolean);
const noQuotesQuote = "Did you really disable all loading quotes? What a buffoon you are...";

export { noQuotesQuote, presetQuotes };
