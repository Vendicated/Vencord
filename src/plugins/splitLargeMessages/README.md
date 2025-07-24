# Split Large Messages Plugin

A Vencord plugin that automatically splits messages exceeding Discord's character limit into multiple smaller messages.

Allows users to send long content without encountering the message length restriction modal.

## Overview

This plugin solves Discord's message length limitation by:
1. **Modifying the max length constants** - Patches Discord's message length constants without DOM manipulation.
2. **Splitting long messages** - Breaks messages into chunks that fit within Discord's limits.
3. **Splitting by sentence** - Preserves readability by splitting after sentences.
4. **Splitting by newline** - Keeps newlines seamlessly when splitting messages at newline characters.
5. **Edge cases** - Handles edge cases such as very long words or failing of sentence splitting.

Please contact me @celgost for support or feedback.
