One-line: wraps a control with its label, hint and translated error message.

```jsx
<Field label="Senha" htmlFor="senha" hint="Mínimo de 8 caracteres" error={errors.password}>
  <Input id="senha" type="password" invalid={!!errors.password} />
</Field>
```

- The error replaces the hint and renders with an alert icon (never color alone).
- Messages are pt-BR and translated from `error.problem.code`, not from the API's `message`.
