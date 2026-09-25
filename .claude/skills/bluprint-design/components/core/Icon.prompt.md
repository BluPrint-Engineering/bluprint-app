One-line: renders a Lucide glyph in currentColor; the only way icons enter a BluPrint screen.

```jsx
<Icon name="map-pin" size={24} />
<Button iconStart={<Icon name="plus" />}>Novo pin</Button>
```

- The 24 glyphs are embedded in the component. To add one, drop the lucide SVG into `assets/icons/` (kebab-case name) and add it to `GLYPHS` in `Icon.jsx`.
- Never draw an icon by hand and never use emoji.
