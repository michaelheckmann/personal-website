/**
 * Returns the Raycast menubar command for changing the icon.
 * @param icon - The icon to be used in the command.
 * @returns The Raycast menubar command.
 */
export const getRaycastMenubarCommand = (icon: string) => {
  return `'raycast://extensions/michaelheckmann/menu-bar-manager/change-icon?launchType=background&arguments=%7B%22icon%22%3A%22${icon}%22%7D'`;
};
