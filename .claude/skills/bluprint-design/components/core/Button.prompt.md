One-line: the product's only button — use it for every action, and never style a bare `<button>`.

```jsx
<Button size="lg" block loading={isSubmitting}>Entrar</Button>
<Button variant="outline" iconStart={<RefreshIcon />}>Atualizar</Button>
<Button variant="link" as="a" href="/cadastro">Criar conta</Button>
```

- `variant`: `default` (brand blue) · `outline` · `secondary` · `ghost` · `destructive` (tinted, not solid) · `link`.
- `size`: `sm` 36px (desktop toolbars only) · `md` 44px · `lg` 52px (primary action in the field) · `icon`/`icon-sm`.
- Press nudges 1px down; focus draws a 3px brand ring. Labels are pt-BR, sentence case, verb first ("Entrar", "Criar conta", "Gerar relatório").
