# Command Palette Actions Guide

Welcome to the Command Palette Actions Guide! This guide serves to inform you on how to implement your own actions to the CommandPalette plugin. To do so you have two options: hardcoding or utilizing the `registerAction` function. This guide will focus on using the function as its best practice and is what should be used in most situations.

> [!IMPORTANT]
> While both methods hardcoding and using `registerAction` offer similar implementations, it's recommended to refrain from Hardcoding unless you solely plan on using this locally.

### Implementing Multiple Choice Modals

```ts
registerAction({
    id: 'multipleChoiceCommand',
    label: 'Multiple Choice',
    callback: async () => {
        // Open a modal with multiple choices
        const choice = await openMultipleChoice([
            { id: 'test1', label: 'Test 1' },
            { id: 'test2', label: 'Test 2' },
        ]);

        // Log the selected choice with its label and ID
        console.log(`Selected ${choice.label} with the ID ${choice.id}`);
    },
});
```

- **ID**: A unique identifier for the command/action, ensuring uniqueness across specific options in that modal instance.
- **Label**: The text displayed in the command palette for user recognition.
- **Callback (optional)**: The function executed when the command is triggered.

Inside the callback, the `openMultipleChoice` function opens a modal with a list of choices. Users can select an option, and upon choosing, a `ButtonAction` type is returned. The user's choice is then logged for reference.

### Implementing String Input Modals

```ts
registerAction({
    id: 'stringInputCommand',
    label: 'String Input',
    callback: async () => {
        // Open a modal with a text input
        const text = await openSimpleTextInput();

        // Log the inputted text to console
        console.log(`They typed: ${text}`);
    },
});
```

When the `stringInputCommand` is triggered, a modal with a simple text input field appears. Users can input text, and the entered string is returned. In this case, we log their input to console.
