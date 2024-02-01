# Custom Commands Documentation

## Adding Custom Commands to Command Palette

To enhance your application with custom commands in the command palette, you have two options: hardcoding the commands or using the exported `registerAction` function. Both methods share almost identical implementations, as the function requires the same arguments as hardcoding.

For the examples below, we'll focus on using the `registerAction` function.

### Implementing Multiple Choice Modals

```ts
registerAction({
    id: 'multipleChoiceCommand',
    label: 'Multiple Choice',
    callback: async () => {
        const choice = await openMultipleChoice([
            { id: 'test1', label: 'Test 1' },
            { id: 'test2', label: 'Test 2' },
        ]);

        console.log(`Selected ${choice.label} with the ID ${choice.id}`);
    },
});
```

**ID**: A unique identifier for the command. Ensure it is unique across all commands.

**Label**: The text that will be displayed in the command palette.

**Callback**: The function that executes when the command is triggered.

Inside the callback, we use the `openMultipleChoice` function, which opens a modal with a list of choices. Users can then select an option, and the function returns a `ButtonAction`, which is the same object used in the `registerAction` function.

Finally, we log the user's choice for reference.

### Implementing String Input Modals
To allow users to input a string, you can use the following example:

```ts
registerAction({
    id: 'stringInputCommand',
    label: 'String Input',
    callback: async () => {
        const text = await openSimpleTextInput();
        console.log(`They typed: ${text}`);
    },
});
```

In this example, when the 'String Input' command is triggered, a modal with a simple text input field appears. The user can input text, and the entered string is then logged for further processing.

Remember to replace 'stringInputCommand' and 'String Input' with your desired unique identifier and display label. This allows you to customize the command according to your application's needs.
