# Caesar Cipher

Encrypt and translate Caesar Cipher messages directly in Discord.

## Features

- Toggle encryption from the Discord chat bar
- Automatically encrypt messages before sending
- Translate encrypted messages from the message menu
- Shift of 3 with uppercase and lowercase preserved

## How it works

Each letter is shifted **3 positions backward** through the alphabet.

For example:

`A` → `X`
`B` → `Y`
`C` → `Z`
`D` → `A`
`E` → `B`
`F` → `C`

The alphabet wraps around when the beginning is reached.

For example:

`hello` → `ebiil`

Translation reverses the process by shifting each letter **3 positions forward**:

`ebiil` → `hello`

Numbers, spaces, punctuation, emojis, and other symbols are unchanged.
