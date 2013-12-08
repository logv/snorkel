## 1.0.0
- Major: The API no longer automatically assumes an `module.exports` pattern. It
  will always return an object with all introduced globals.

## 0.1.4
- Don't expose the `module.exports` and `exports` as predefined globals.

## 0.1.3
- Don't throw when we cannot delete the introduced globals.

## 0.1.2
- Fixes optional globals arg.

## 0.1.1
- Make it possible to add globals to the loaded script.
- Added missing `__dirname` and `__filename`.

## 0.1.0
- It exposes the compiler.

## 0.0.3
- Removed pointless missing globals code, we can just use `global` variable as
  it's available in node and lists all introduced globals.

## 0.0.2
- Added some missing globals

## 0.0.1
- Automatically add a `.js` extension if missing.

## 0.0.0
- initial release
