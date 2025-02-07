import { Icon } from "@raycast/api";

type States = Record<
  string,
  {
    icon: Icon;
    tooltip: string;
  }
>;

export const states: States = {
  default: {
    icon: Icon.Circle,
    tooltip: "Default state",
  },
  shortcut: {
    icon: Icon.CircleFilled,
    tooltip: "Executing shortcut",
  },
  launcher: {
    icon: Icon.ArrowUpCircle,
    tooltip: "Opening app",
  },
};
