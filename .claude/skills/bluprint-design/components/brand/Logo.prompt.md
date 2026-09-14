One-line: renders the BluPrint logo from the vector assets — never retype, redraw or set the wordmark in a font.

```jsx
<Logo size={56} />                                        {/* mark only, gradient */}
<Logo size={32} wordmark basePath="../../assets" />       {/* horizontal lockup */}
<Logo size={64} stacked tone="white" basePath="../../assets" />
```

- The wordmark is SVG geometry traced from the brand file, so it is font-independent.
- On brand blue, dark navy or a photo use `tone="white"`; on light surfaces prefer `gradient`.
- `size` always means the mark's height; lockups scale from it.
