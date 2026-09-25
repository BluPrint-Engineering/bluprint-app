One-line: the user's initials (or photo) in a circle — decorative, so the button around it carries the label.

```jsx
<Button variant="ghost" aria-label="Abrir menu da conta"><Avatar name="Guilherme Lopes" /></Button>
<Avatar name="Ana Beatriz Souza" size="lg" />
```

- Initials are first + last word, uppercase: "Ana Beatriz Souza" → **AS**. Brand accent tint, never a random color per user.
- `src` wins over initials when a photo exists (upload is out of scope today).
