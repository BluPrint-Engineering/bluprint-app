One-line: the inline banner for a failed submit, an offline queue notice or a confirmation.

```jsx
<Alert tone="danger" title="Não foi possível entrar">E-mail ou senha incorretos.</Alert>
<Alert tone="info">3 pins aguardando envio. Eles sobem quando você voltar a ter sinal.</Alert>
```

- `danger` carries `role="alert"`; the others `role="status"`.
