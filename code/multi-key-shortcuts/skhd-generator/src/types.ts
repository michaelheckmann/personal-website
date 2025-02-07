/**
 * All possible icons that are supported by the menu-bar-manager extension
 */
export type Icon = "default" | "shortcut" | "launcher";

/**
 * A mode that can be switched to
 */
export type Mode = {
  name: string;
  icon: Icon;
  isDefault: boolean;
};

/**
 * All possible modifier keys
 */
export type Modifier =
  | "fn"
  | "cmd"
  | "lcmd"
  | "rcmd"
  | "shift"
  | "lshift"
  | "rshift"
  | "alt"
  | "lalt"
  | "ralt"
  | "ctrl"
  | "lctrl"
  | "rctrl"
  | "hyper"
  | "meh";

/*+
 * All possible key literals as specified by skhd
 */
export type KeyLiteral =
  | "return"
  | "tab"
  | "space"
  | "backspace"
  | "escape"
  | "delete"
  | "home"
  | "end"
  | "pageup"
  | "pagedown"
  | "insert"
  | "left"
  | "right"
  | "up"
  | "down"
  | "f1"
  | "f2"
  | "f3"
  | "f4"
  | "f5"
  | "f6"
  | "f7"
  | "f8"
  | "f9"
  | "f10"
  | "f11"
  | "f12"
  | "f13"
  | "f14"
  | "f15"
  | "f16"
  | "f17"
  | "f18"
  | "f19"
  | "f20"
  | "sound_up"
  | "sound_down"
  | "mute"
  | "play"
  | "previous"
  | "next"
  | "rewind"
  | "fast"
  | "brightness_up"
  | "brightness_down"
  | "illumination_up"
  | "illumination_down";

/**
 * The most comman characters and numbers
 */
export type Char =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z"
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "<";

/**
 * All possible keys
 */
export type Key = KeyLiteral | Char | `0x${string}`;

export type ShortcutWithModifiers<T extends string> = {
  mode: T;
  modifiers: Modifier[];
  key: Key;
  omitModifierAllowed?: boolean;
  command: string;
  comment: string;
};
export type ShortcutWithoutModifiers<T extends string> = {
  mode: T;
  key: Key;
  command: string;
  modifiers?: never;
  omitModifierAllowed?: never;
  comment: string;
};

/**
 * A shortcut with or without modifiers
 */
export type Shortcut<T extends string> =
  | ShortcutWithModifiers<T>
  | ShortcutWithoutModifiers<T>;

/**
 * A shortcut, exclusively used for mode switching
 */
export type ModeShortcut = {
  modifiers: Modifier[];
  key: Key;
};

/**
 * A shortcut command, exclusively used for mode switching
 */
export type ModeShortcutCommand<T extends string> = {
  fromMode: T;
  toMode: T;
  shortcut: ModeShortcut;
};

/**
 * The valid Arc Space name
 */
export type Space = "Space1" | "Space2";
