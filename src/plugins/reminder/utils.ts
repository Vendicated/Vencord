import { showNotification } from "@api/Notifications";

export function notify(text: string, onClick?: () => void) {
    showNotification({
        title: "Reminder",
        body: text,
        onClick
    });
}
