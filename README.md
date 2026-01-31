# Edit Field During Review - Cloze Enhanced

An Anki add-on that lets you edit fields directly during review, with powerful cloze manipulation tools.

## Features

### Field Editing
- **Ctrl+Click** on any field to edit it directly during review
- Changes are saved automatically when you click away
- Undo support with Ctrl+Z

### Command Palette
Press **Ctrl+.** to open a searchable command palette with all available actions.

### Cloze Tools

All shortcuts use Ctrl on Windows/Linux and Cmd on Mac. Alt = Opt on Mac.

#### Cloze Removal
| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+R | Remove cloze at cursor/selection |
| Ctrl+Shift+U | Remove ALL clozes in field |
| Ctrl+Shift+Alt+R | Remove clozes with same number |

#### Cloze Numbering
| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+Alt+K | Increment cloze number |
| Ctrl+Shift+Alt+J | Decrement cloze number |
| Ctrl+Shift+Alt+N | Renumber cloze (then press 1-9) |

#### Hints
| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+L | Add/edit hint |
| Ctrl+Shift+Alt+L | Remove hint |
| Ctrl+Shift+W | Add word count as hint |
| Ctrl+Shift+Alt+S | Use selection as hint |

#### Cloze Structure
| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+S | Split cloze at selection |
| Ctrl+Shift+Alt+M | Merge same-number clozes |
| Ctrl+Shift+O | Move selection out of cloze |
| Ctrl+Shift+Alt+O | Move selection into cloze |
| Ctrl+Shift+Alt+I | Convert image to cloze |

#### Navigation
| Shortcut | Action |
|----------|--------|
| Ctrl+] | Jump to next cloze |
| Ctrl+[ | Jump to previous cloze |
| Ctrl+Shift+Alt+, | Jump to beginning of field |
| Ctrl+Shift+Alt+. | Jump to end of field |

#### Tools
| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+Alt+T | Toggle cloze info overlay |
| Ctrl+Shift+Alt+Y | Copy cloze content to clipboard |
| Ctrl+Shift+Alt+P | Preview card |
| Ctrl+Shift+Alt+G | Find & replace in clozes |
| Ctrl+Shift+G | Suggest cloze candidates |
| Ctrl+Shift+Alt+F | Replay question (show front) |

## Configuration

Open the add-on config from Tools > Add-ons > Config to:
- Select which fields are editable per note type
- Customize keyboard shortcuts
- Configure formatting options

---

# Development

## Setup
After cloning the project, run the following command
```
git submodule update --init --recursive
npm ci
```
The first command installs [ankiaddonconfig](https://github.com/BlueGreenMagick/ankiaddonconfig/) as a git submodule, and the second command installs the npm dev dependencies of this project.

## Updating typescript code

After editing code in [./src/ts](./src/ts), run `npm run build` to compile it to [./src/addon/web/editor/editor.js](./src/addon/web/editor/editor.js).

## Tests & Formatting
This project uses [mypy](https://github.com/python/mypy) type checking for Python, and [standardjs](https://github.com/standard/standard) for formatting Javascript.

```
python -m mypy .
npx standard --fix
```

You will need to install the following python packages to run mypy:
```
python -m pip install aqt PyQt5-stubs mypy types-simplejson
```

## Building ankiaddon file
After cloning the repo, go into the repo directory and run the following command to install the git submodule [ankiaddonconfig](https://github.com/BlueGreenMagick/ankiaddonconfig/)
```
git submodule update --init --remote src/addon/ankiaddonconfig
```
After installing the git submodule, run the following command to create the `.ankiaddon` file
```
cd src/addon ; zip -r ../../edit-field-during-review-cloze-enhanced.ankiaddon * ; cd ../../
```
