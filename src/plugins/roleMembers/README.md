# RoleMembersViewer

A Vencord plugin that displays all members with a specific role when you right-click on a role in a user profile or when a message mentions roles.

The plugin fetches as many members as possible, including offline ones, and organizes them in a nested submenu for a clear and efficient view.

## Features

-   **Dev Context:** Right-click on a role in a user profile to see a list of all members with that role.
-   **Message Context:** Right-click on a message containing role mentions to display a submenu with all the roles and their corresponding members. This also works if a message has multiple role mentions!
-   **Automatic Member Fetching:** Uses FluxDispatcher to fetch as many members as possible, efficently.
-   **Live Updates:** The plugin takes advantage of GuildMemberStore updates so that the list can reflect changes

## Examples

### Dev Context Menu

![Dev Context Screenshot](https://github.com/user-attachments/assets/94cc1ecf-8250-4153-a7cc-31fe748d19fb)

### Message Context Menu

![Message Context Screenshot](https://github.com/user-attachments/assets/7755a40b-b5b1-4191-a2a7-726e83fbcfda)

## Installation

-   You can find installation instructions [here](https://docs.vencord.dev/installing/custom-plugins/)

## Usage

-   **In User Profiles:** Right-click on a role to see the "View Members" submenu populated with all users having that role.
-   **In Messages:** Right-click on a message with role mentions to open a submenu where you can view users for each mentioned role. Upon right-clicking on a message with multiple, it will display a submenu with all the roles that have been mentioned, and then you're free to view the members of each one!
-   **In both scenarios**, you can click a user in the submenu to pop up their profile!
