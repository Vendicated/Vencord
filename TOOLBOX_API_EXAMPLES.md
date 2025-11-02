# Vencord Toolbox API Examples

This document provides examples of how to use the enhanced Vencord Toolbox API.

## Overview

The toolbox API now supports three types of actions:
1. **Button** - Simple clickable buttons (default)
2. **Checkbox** - Toggle switches
3. **Custom** - Arbitrary React components for advanced use cases

## Backward Compatibility

The API remains fully backward compatible with the legacy function format:

```typescript
toolboxActions: {
    "My Action"() {
        console.log("Action clicked");
    }
}
```

## Button Type Examples

### Simple Button (New Format)

```typescript
toolboxActions: {
    "My Action": {
        type: "button",
        label: "Click Me",
        action() {
            console.log("Button clicked");
        }
    }
}
```

### Button with Icon

```typescript
import { TrashIcon } from "@webpack/common";

toolboxActions: {
    "Delete Cache": {
        type: "button",
        label: "Clear Cache",
        icon: TrashIcon,
        action() {
            // Clear cache logic
        }
    }
}
```

### Disabled Button

```typescript
toolboxActions: {
    "Premium Feature": {
        type: "button",
        label: "Premium Only",
        disabled: true,
        action() {
            // This won't be called when disabled
        }
    }
}
```

## Checkbox Type Examples

### Simple Checkbox

```typescript
const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Enable the feature"
    }
});

toolboxActions: {
    "Enable Feature": {
        type: "checkbox",
        label: "Enable Feature",
        get checked() {
            return settings.store.enabled;
        },
        action(checked) {
            settings.store.enabled = checked ?? false;
        }
    }
}
```

### Checkbox with Dynamic State

```typescript
let isActive = false;

toolboxActions: {
    "Toggle Mode": {
        type: "checkbox",
        label: "Dark Mode",
        get checked() {
            return isActive;
        },
        action(checked) {
            isActive = checked ?? false;
            // Apply dark mode logic
        }
    }
}
```

## Custom Render Examples

### Custom Menu Item with Separator

```typescript
import { Menu } from "@webpack/common";

toolboxActions: {
    "Custom Separator": {
        type: "custom",
        label: "Custom",
        render: (key) => (
            <>
                <Menu.MenuSeparator />
                <Menu.MenuItem
                    id={key}
                    key={key}
                    label="Custom Item"
                    action={() => console.log("Custom action")}
                />
            </>
        )
    }
}
```

### Custom Menu Control with Slider

```typescript
import { Menu } from "@webpack/common";

toolboxActions: {
    "Volume Control": {
        type: "custom",
        label: "Volume",
        render: (key) => (
            <Menu.MenuControlItem
                id={key}
                key={key}
                label="Volume"
            >
                <Menu.MenuSliderControl
                    minValue={0}
                    maxValue={100}
                    value={settings.store.volume}
                    onChange={(value) => {
                        settings.store.volume = value;
                    }}
                    renderValue={(value) => `${value}%`}
                />
            </Menu.MenuControlItem>
        )
    }
}
```

### Custom Menu Group with Multiple Items

```typescript
import { Menu } from "@webpack/common";

toolboxActions: {
    "Advanced Options": {
        type: "custom",
        label: "Advanced",
        render: (key) => (
            <>
                <Menu.MenuSeparator />
                <Menu.MenuItem
                    id={`${key}-option-1`}
                    key={`${key}-option-1`}
                    label="Option 1"
                    action={() => console.log("Option 1")}
                />
                <Menu.MenuItem
                    id={`${key}-option-2`}
                    key={`${key}-option-2`}
                    label="Option 2"
                    action={() => console.log("Option 2")}
                />
            </>
        )
    }
}
```

## Complete Example Plugin

Here's a complete plugin demonstrating all three types:

```typescript
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Menu } from "@webpack/common";

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Enable the feature"
    },
    volume: {
        type: OptionType.NUMBER,
        default: 50,
        description: "Volume level"
    }
});

export default definePlugin({
    name: "ExamplePlugin",
    description: "Example plugin showing all toolbox action types",
    authors: [{ name: "Example", id: 0n }],
    settings,

    toolboxActions: {
        // Legacy format - still works!
        "Quick Action"() {
            console.log("Quick action clicked");
        },

        // Button type
        "Refresh Data": {
            type: "button",
            label: "Refresh",
            action() {
                console.log("Refreshing data...");
            }
        },

        // Checkbox type
        "Toggle Feature": {
            type: "checkbox",
            label: "Enable Feature",
            get checked() {
                return settings.store.enabled;
            },
            action(checked) {
                settings.store.enabled = checked ?? false;
            }
        },

        // Custom type with slider
        "Volume Control": {
            type: "custom",
            label: "Volume",
            render: (key) => (
                <Menu.MenuControlItem
                    id={key}
                    key={key}
                    label="Volume"
                >
                    <Menu.MenuSliderControl
                        minValue={0}
                        maxValue={100}
                        value={settings.store.volume}
                        onChange={(value) => {
                            settings.store.volume = value;
                        }}
                        renderValue={(value) => `${value}%`}
                    />
                </Menu.MenuControlItem>
            )
        }
    }
});
```

## Best Practices

1. **Use the appropriate type**: Choose the simplest type that meets your needs
   - Legacy function format for simple actions
   - Button type when you need icons or disabled states
   - Checkbox type for toggles
   - Custom type only when you need complex UI

2. **Keep actions focused**: Each action should do one thing well

3. **Provide clear labels**: Make sure users understand what each action does

4. **Use getters for dynamic state**: When using checkboxes, use getters to ensure the checked state is always current

5. **Follow existing patterns**: Look at how other plugins use the toolbox API for consistency

## Migration Guide

If you have existing plugins using the legacy format, they will continue to work without changes. To adopt the new API:

1. **Simple actions**: No changes needed, or optionally convert to explicit button type
2. **Toggle functionality**: Convert to checkbox type for better UX
3. **Complex interactions**: Use custom render for full control

Example migration:

```typescript
// Old way
toolboxActions: {
    "Toggle Feature"() {
        settings.store.enabled = !settings.store.enabled;
    }
}

// New way (better UX)
toolboxActions: {
    "Toggle Feature": {
        type: "checkbox",
        label: "Enable Feature",
        get checked() {
            return settings.store.enabled;
        },
        action(checked) {
            settings.store.enabled = checked ?? false;
        }
    }
}
```
