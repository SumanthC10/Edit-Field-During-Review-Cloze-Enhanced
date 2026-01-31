# FAQ

## General

### I can't edit the cards while reviewing!

Please check if you enabled editing your field in the note type. Go to the addon config, select the `Fields` tab. Choose your note type from the dropdown and see if the fields are editable.

Alternatively, you can control each field's editability by editing the notetype card template. Add or remove `edit:` from the field name. For example, `{{edit:Front}}`, `{{edit:cloze:Text}}`.

### What do I put in as keyboard shortcut?

Each shortcut can have `"Ctrl"`, `"Shift"`, `"Alt"`, and one other key. They are combined using `+`.

Examples: `"K"`, `"Ctrl+C"`, `"Alt+Shift+,"`, `"Ctrl+Alt+F1"`

If you are using Mac, press `Cmd` key for `"Ctrl"`, and `Opt` key for `"Alt"`.

### How do I open the command palette?

Press `Ctrl+.` (Cmd+. on Mac) while editing a field to open the searchable command palette with all available actions.

## Cloze Tools

### How do I remove a cloze?

Place your cursor inside a cloze and press `Ctrl+Shift+R`. This removes the cloze markers but keeps the text.

To remove ALL clozes in a field, press `Ctrl+Shift+U`.

To remove all clozes with the same number, press `Ctrl+Shift+Alt+R`.

### How do I change a cloze number?

Place your cursor inside a cloze and press:
- `Ctrl+Shift+Alt+K` to increment the number
- `Ctrl+Shift+Alt+J` to decrement the number
- `Ctrl+Shift+Alt+N` then press 1-9 to set a specific number

### How do I add a hint to a cloze?

Place your cursor inside a cloze and press `Ctrl+Shift+L`. Type your hint and press Enter or Escape to confirm.

Other hint options:
- `Ctrl+Shift+W` - Add word count as hint (e.g., "3 words")
- `Ctrl+Shift+Alt+S` - Use selected text as the hint
- `Ctrl+Shift+Alt+L` - Remove existing hint

### How do I split a cloze?

Select the text where you want to split, then press `Ctrl+Shift+S`. The cloze will be split into two clozes with the same number.

### How do I merge clozes?

Press `Ctrl+Shift+Alt+M` while inside a cloze. All clozes with the same number in the field will be merged into one.

### How do I move text in/out of a cloze?

- **Move out**: Select text inside a cloze that extends outside it, press `Ctrl+Shift+O`
- **Move in**: Select text that overlaps a cloze plus adjacent text, press `Ctrl+Shift+Alt+O`

### What does "Suggest Clozes" do?

Press `Ctrl+Shift+G` to highlight potential cloze candidates in the field (important terms, definitions, etc.). Click on a suggestion to convert it to a cloze.

### How do I navigate between clozes?

- `Ctrl+]` - Jump to next cloze
- `Ctrl+[` - Jump to previous cloze
- `Ctrl+Shift+Alt+,` - Jump to beginning of field
- `Ctrl+Shift+Alt+.` - Jump to end of field

### What is the cloze overlay?

Press `Ctrl+Shift+Alt+T` to toggle an overlay that shows cloze numbers and positions visually. Useful for complex cards with many clozes.

## Customization

### Can I have multiple formatting shortcuts?

Yes. Go to the Advanced config editor. In `special_formatting`, copy an entry and give it a unique name. You can have multiple color shortcuts, etc.

### How do I apply styles to editable field html?

Use the CSS selector `div[data-efdrcfield]` (or `span[data-efdrcfield]` depending on your config).

### How do I align fields next to each other?

Add this to your note type template styling:

```css
div[data-efdrcfield] {
  display: inline-block;
}
```

### How to add a custom shortcut action?

Add this JavaScript to your note type template:

```javascript
EFDRC.registerShortcut("Ctrl+Shift+Alt+X", (event, elem) => {
  // event: KeyEvent, elem: contenteditable field element
  // Your custom code here
})
```

### How to edit conditionally hidden fields?

When using conditional replacement to hide empty fields, modify your template:

```html
<div class="{{^Field}}hidden{{/Field}}">
  {{Field}}
</div>
```

Add to Styling:

```css
.hidden {
  display: none;
}

[data-efdrc-ctrl] .hidden,
[data-efdrc-editing] .hidden {
  display: block;
}
```

This shows hidden fields when Ctrl is pressed or while editing.
