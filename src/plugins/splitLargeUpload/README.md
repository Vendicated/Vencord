# splitLargeUpload

this plugin splits big files into small parts so you can send them on discord even when they are bigger than your upload limit

## what it does

discord has an upload limit and if you are on the free tier the limit is small and most big files will not go through but this plugin catches the file before discord shows the red error and then it splits the file into parts that fit under your limit and you send the parts one by one and the other person puts them back together with a small reassembler page

## how it works

1. you drop or paste or pick a file
2. the plugin checks the size against your limit
3. if the file is too big a popup asks if you want to split it
4. the plugin slices the file and makes a sha256 fingerprint for every slice
5. a small json manifest goes out first with the file name and size and part count and every fingerprint
6. each part goes out as its own message with a header like part 3 of 8 and there is a short delay between messages so discord does not rate limit you
7. the other person downloads all the parts and the manifest and opens the reassembler page and drops everything in
8. the reassembler matches each part by its fingerprint and glues the bytes back in the same order so you get the exact same file you started with

## why the parts are safe

the bytes are never changed because the reassembler just puts them back in the same order so the output file is identical to the input file and if the original file was signed the signature stays valid because not a single byte is different

## how to use it

- keep discord open while the parts send because closing it stops the upload halfway
- set the chunk size to 0 for auto so the plugin picks the biggest size your limit allows because smaller chunk sizes make more parts and more messages and a slower upload
- send the reassembler page to the other person so they can put the file back together

## notes

- the other person needs the reassembler page and it is a small html file so you can send it in the chat
- if the first message fails check the console for red text and report it
- windows may still show its normal warnings for downloaded exe files and that is not caused by this plugin

## license

gpl-3.0