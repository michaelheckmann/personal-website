import { Icon, List } from "@raycast/api";
import { parseSkhdrc } from "./parse-skhdrc";

const items = parseSkhdrc();

export default function Command() {
  return (
    <List>
      {Object.entries(items).map(([section, items]) => (
        <List.Section key={section} title={section}>
          {items.map((item) => (
            <List.Item
              key={item.command}
              title={item.description}
              subtitle={item.keys[0]}
              accessories={[{ tooltip: item.command, icon: Icon.CommandSymbol }]}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
