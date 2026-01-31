import os

from aqt import mw
from aqt.utils import showText

from .ankiaddonconfig import ConfigManager


conf = ConfigManager()


class Version:
    def __init__(self) -> None:
        self.load()

    def load(self) -> None:
        self.major = conf["version.major"]
        self.minor = conf["version.minor"]
        # v6.x has string version
        if isinstance(self.major, str):
            self.major = int(self.major)
        if isinstance(self.minor, str):
            self.major = int(self.minor)

    def __eq__(self, other: str) -> bool:  # type: ignore
        ver = [int(i) for i in other.split(".")]
        return self.major == ver[0] and self.minor == ver[1]

    def __gt__(self, other: str) -> bool:
        ver = [int(i) for i in other.split(".")]
        return self.major > ver[0] or (self.major == ver[0] and self.minor > ver[1])

    def __lt__(self, other: str) -> bool:
        ver = [int(i) for i in other.split(".")]
        return self.major < ver[0] or (self.major == ver[0] and self.minor < ver[1])

    def __ge__(self, other: str) -> bool:
        return self == other or self > other

    def __le__(self, other: str) -> bool:
        return self == other or self < other


version = Version()


# Initial installation have config version of -1.-1
# Versions before 6.0 will have config version of 0.0
# However if the user hasn't edited their config, it will show up as -1.-1


def distinguish_initial_install() -> None:
    if not version == "-1.-1":
        return
    if conf.get("undo", None):
        conf["version.major"] = 0
        conf["version.minor"] = 0
        conf.save()
        version.load()


distinguish_initial_install()


# Make config compatible when upgrading from older version


def change_resize_image_preserve_ratio() -> None:
    resize_conf = conf["resize_image_preserve_ratio"]
    if not isinstance(resize_conf, bool):
        return

    if resize_conf:
        conf["resize_image_preserve_ratio"] = 1
    else:
        conf["resize_image_preserve_ratio"] = 0
    conf.save()


change_resize_image_preserve_ratio()


def change_special_formatting() -> None:
    if not "z_special_formatting" in conf:
        return
    for key in conf["z_special_formatting"]:
        opts = conf["z_special_formatting"][key]
        if isinstance(opts, list):
            enabled = opts[0]
            arg = opts[1]
        else:
            enabled = opts
            arg = None
        conf[f"special_formatting.{key}.enabled"] = enabled
        if arg is not None:
            conf[f"special_formatting.{key}.arg"] = {
                "type": "color" if key in ["fontcolor", "highlight"] else "text",
                "value": arg,
            }

    del conf["z_special_formatting"]
    conf.save()


change_special_formatting()


def remove_undo() -> None:
    if not "undo" in conf:
        return
    del conf["undo"]
    conf.save()


remove_undo()


def initial_tutorial() -> None:
    tutorial = """
<style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
    h2 { text-align: center; margin-bottom: 5px; }
    h3 { color: #888; text-align: center; margin-top: 0; font-weight: normal; }
    h4 { color: #4a9eff; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px; }
    .section { margin-bottom: 15px; }
    .shortcut { display: inline-block; font-family: monospace; font-weight: bold; }
    ul { margin: 5px 0; padding-left: 20px; }
    li { margin: 4px 0; }
</style>

<h2>Edit Field During Review Cloze Enhanced</h2>
<h3>Quick Start Guide</h3>

<h4>Initial Setup</h4>
<div class="section">
1. Open the add-on config and go to the <b>Fields</b> tab<br>
2. For each note type, check the fields you want editable<br>
3. Done! Now <span class="shortcut">Ctrl + Click</span> on any field to edit it
</div>

<h4>Command Palette</h4>
<div class="section">
<span class="shortcut">Ctrl+.</span> - Open searchable command palette with ALL actions
</div>

<h4>Cloze Removal</h4>
<ul>
<li><span class="shortcut">Ctrl+Shift+R</span> - Remove cloze at cursor/selection</li>
<li><span class="shortcut">Ctrl+Shift+U</span> - Remove ALL clozes in field</li>
<li><span class="shortcut">Ctrl+Shift+Alt+R</span> - Remove clozes with same number</li>
</ul>

<h4>Cloze Numbering</h4>
<ul>
<li><span class="shortcut">Ctrl+Shift+Alt+K</span> - Increment number</li>
<li><span class="shortcut">Ctrl+Shift+Alt+J</span> - Decrement number</li>
<li><span class="shortcut">Ctrl+Shift+Alt+N</span> - Renumber (then press 1-9)</li>
</ul>

<h4>Hints</h4>
<ul>
<li><span class="shortcut">Ctrl+Shift+L</span> - Add/edit hint</li>
<li><span class="shortcut">Ctrl+Shift+Alt+L</span> - Remove hint</li>
<li><span class="shortcut">Ctrl+Shift+W</span> - Word count hint</li>
<li><span class="shortcut">Ctrl+Shift+Alt+S</span> - Use selection as hint</li>
</ul>

<h4>Cloze Structure</h4>
<ul>
<li><span class="shortcut">Ctrl+Shift+S</span> - Split cloze at selection</li>
<li><span class="shortcut">Ctrl+Shift+Alt+M</span> - Merge same-number clozes</li>
<li><span class="shortcut">Ctrl+Shift+O</span> - Move selection out of cloze</li>
<li><span class="shortcut">Ctrl+Shift+Alt+O</span> - Move selection into cloze</li>
<li><span class="shortcut">Ctrl+Shift+Alt+I</span> - Convert image to cloze</li>
</ul>

<h4>Navigation</h4>
<ul>
<li><span class="shortcut">Ctrl+]</span> - Jump to next cloze</li>
<li><span class="shortcut">Ctrl+[</span> - Jump to previous cloze</li>
<li><span class="shortcut">Ctrl+Shift+Alt+F</span> - Replay question (show front)</li>
</ul>

<h4>Tools</h4>
<ul>
<li><span class="shortcut">Ctrl+Shift+Alt+T</span> - Toggle cloze info overlay</li>
<li><span class="shortcut">Ctrl+Shift+Alt+Y</span> - Copy cloze content</li>
<li><span class="shortcut">Ctrl+Shift+Alt+P</span> - Preview card</li>
<li><span class="shortcut">Ctrl+Shift+Alt+G</span> - Find & replace in clozes</li>
<li><span class="shortcut">Ctrl+Shift+G</span> - Suggest cloze candidates</li>
</ul>

<p style="text-align: center; color: #888; margin-top: 20px;">
Tip: Use <span class="shortcut">Ctrl+.</span> to search all commands!
</p>
"""
    showText(tutorial, type="html", title="Edit Field During Review Cloze Enhanced")


if version == "-1.-1":
    initial_tutorial()

# Save current version
version_string = os.environ.get("EFDRC_VERSION")
if not version_string:
    addon_dir = mw.addonManager.addonFromModule(__name__)
    meta = mw.addonManager.addonMeta(addon_dir)
    version_string = meta.get("human_version", "6.23")

conf["version.major"] = int(version_string.split(".")[0])
conf["version.minor"] = int(version_string.split(".")[1])
conf.save()
