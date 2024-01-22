
# SearchFix

Fixes the annoying "we dropped the magnifying glass!" error. This fix isn't perfect, so you may have to reload the search bar to fix issues. Discord only allows a max offset of 5000 (this is what causes the magnifying glass error). This means that you can only see precisely 5000 messages into the past, and 5000 messages into the future (when sorting by old). This plugin just jumps to the opposite sorting method to try get around Discord's restriction, but if there is a large search result, and you try to view a message that is unobtainable with both methods of sorting, the plugin will simply show offset 0 (either newest or oldest message depending on the sorting method).


## Before and After
Before
![Before](https://files.catbox.moe/q9lm4z.gif)

After
![After](https://files.catbox.moe/4ar96e.gif)