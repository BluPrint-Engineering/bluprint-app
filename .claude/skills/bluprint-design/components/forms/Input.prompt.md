One-line: the text input for every form field; always inside a `Field` so it has a label and an error slot.

```jsx
<Field label="E-mail" error={errors.email}>
  <Input type="email" inputMode="email" autoComplete="email" placeholder="voce@construtora.com.br" invalid={!!errors.email} />
</Field>
```

- 44px tall; never shrink it below `--tap-min`.
- `affix` holds a trailing `Button size="icon-sm" variant="ghost"` (show password, clear).
