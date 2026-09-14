One-line: a hairline-ringed surface for a group of content; use it for auth forms, unit sheets and pin summaries.

```jsx
<Card>
  <CardHeader>
    <CardTitle>Entrar</CardTitle>
    <CardDescription>Use o e-mail com que você foi convidado.</CardDescription>
  </CardHeader>
  <CardContent>{form}</CardContent>
  <CardFooter>Não tem conta? <a href="/cadastro">Criar conta</a></CardFooter>
</Card>
```

- `size="sm"` for dense lists; `raised` only when the card floats over a plan.
- The footer is a muted strip with a top border and sits flush to the card's bottom edge.
