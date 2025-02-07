import { LaunchProps, MenuBarExtra } from "@raycast/api";
import { states } from "./states";

export default function Command({ arguments: { icon } }: LaunchProps<{ arguments: Arguments.ChangeIcon }>) {
  const state = states[icon] ?? states.default;
  return <MenuBarExtra icon={state.icon} tooltip={state.tooltip} />;
}
