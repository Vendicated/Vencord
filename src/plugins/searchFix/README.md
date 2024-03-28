
# SearchFix

Fixes the annoying "we dropped the magnifying glass!" error. This fix isn't perfect, so you may have to reload the search bar to fix issues. Discord only allows a max offset of 5000 (this is what causes the magnifying glass error). This means that you can only see precisely 5000 messages into the past, and 5000 messages into the future (when sorting by old). This plugin just jumps to the opposite sorting method to try get around Discord's restriction, but if there is a large search result, and you try to view a message that is unobtainable with both methods of sorting, the plugin will simply show offset 0 (either newest or oldest message depending on the sorting method).


## Before and After
Before <br>
![Before](https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYWk3MmcyZjV1ZmRya2d1Y3Fybjk0MXlhN3lveGhrdjJwemcyMHJxciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LyEAZ3iehro7ECp2VM/giphy.gif)

After <br>
![After](https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN2l3a2RyZXcwdzVvdjE0MHczNHprZ2dncXZyOTlvMDAwdHY2ZHZxayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/5DdKEaH3ppmxsTJxcv/giphy.gif)
