(() => {
const { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Input, Field, Checkbox, Alert, Spinner, Logo, Icon } = window.BluPrintDesignSystem_d4fa62;
const ICONS = "../../assets/icons";

function LoginScreen({ onSignup, onDone, forceLoading = false }) {
  const [email, setEmail] = React.useState("");
  const [senha, setSenha] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [errors, setErrors] = React.useState({});
  const [apiError, setApiError] = React.useState(null);
  const [loading, setLoading] = React.useState(!!forceLoading);

  function submit(e) {
    e.preventDefault();
    const next = {};
    if (!email.trim()) next.email = "Informe o seu e-mail.";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) next.email = "Informe um e-mail válido.";
    if (!senha) next.senha = "Informe a sua senha.";
    setErrors(next);
    setApiError(null);
    if (Object.keys(next).length) return;
    setLoading(true);
    // Demo: the API answers with a problem code; the client translates it (never shows API text).
    setTimeout(() => {
      setLoading(false);
      if (senha === "obra1234") onDone(email);
      else setApiError("E-mail ou senha incorretos.");
    }, 900);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle style={{ fontSize: "var(--text-2xl)" }}>Entrar</CardTitle>
        <CardDescription>Use o e-mail com que você foi convidado para a obra.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} noValidate style={{ display: "grid", gap: "var(--form-gap)" }}>
          {apiError ? <Alert tone="danger" title="Não foi possível entrar">{apiError}</Alert> : null}
          <Field label="E-mail" htmlFor="email" error={errors.email}>
            <Input id="email" type="email" inputMode="email" autoComplete="email" enterKeyHint="next"
              placeholder="voce@construtora.com.br" value={email} invalid={!!errors.email}
              onChange={e => setEmail(e.target.value)} />
          </Field>
          <Field label="Senha" htmlFor="senha" error={errors.senha}>
            <Input id="senha" type={show ? "text" : "password"} autoComplete="current-password" enterKeyHint="go"
              placeholder="Sua senha" value={senha} invalid={!!errors.senha} onChange={e => setSenha(e.target.value)}
              affix={
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setShow(s => !s)}
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"} style={{ color: "var(--muted-foreground)" }}>
                  <Icon name={show ? "eye-off" : "eye"} size={18} basePath={ICONS} />
                </Button>
              } />
          </Field>
          <Button type="submit" size="lg" block loading={loading}>{loading ? "Entrando…" : "Entrar"}</Button>
        </form>
      </CardContent>
      <CardFooter style={{ justifyContent: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)" }}>
        <span style={{ color: "var(--muted-foreground)" }}>Não tem conta?</span>
        <Button variant="link" onClick={onSignup}>Criar conta</Button>
      </CardFooter>
    </Card>
  );
}
Object.assign(window, { LoginScreen });

})();
