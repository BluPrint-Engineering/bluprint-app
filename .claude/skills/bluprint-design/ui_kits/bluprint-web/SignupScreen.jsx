(() => {
const { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Input, Field, Checkbox, Alert, Spinner, Logo, Icon } = window.BluPrintDesignSystem_d4fa62;
const ICONS_S = "../../assets/icons";

/** #43 — reachable only from the invite link (RF-106, RF-130). `invite` is required. */
function SignupScreen({ invite, onLogin, onDone, forceLoading = false }) {
  const [form, setForm] = React.useState({ nome: "", email: invite.email, senha: "" });
  const [aceite, setAceite] = React.useState(false);
  const [show, setShow] = React.useState(false);
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(!!forceLoading);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    const n = {};
    if (form.nome.trim().length < 3) n.nome = "Informe o seu nome completo.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) n.email = "Informe um e-mail válido.";
    if (form.senha.length < 8) n.senha = "A senha precisa de pelo menos 8 caracteres.";
    if (!aceite) n.aceite = "Aceite os termos para continuar.";
    setErrors(n);
    if (Object.keys(n).length) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); onDone(form); }, 900);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle style={{ fontSize: "var(--text-2xl)" }}>Criar conta</CardTitle>
        <CardDescription>Sua conta é única. O papel em cada obra vem do convite.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} noValidate style={{ display: "grid", gap: "var(--form-gap)" }}>
          <Alert tone="info" title={`Convite de ${invite.org}`}>
            Obra {invite.project} · {invite.role}. Ao concluir o cadastro você confirma o convite.
          </Alert>
          <Field label="Nome completo" htmlFor="nome" error={errors.nome}>
            <Input id="nome" autoComplete="name" enterKeyHint="next" placeholder="Como aparece nos relatórios"
              value={form.nome} invalid={!!errors.nome} onChange={set("nome")} />
          </Field>
          <Field label="E-mail" htmlFor="s-email" error={errors.email}
            hint="O convite foi enviado para este e-mail.">
            <Input id="s-email" type="email" inputMode="email" autoComplete="email" enterKeyHint="next"
              placeholder="voce@construtora.com.br" value={form.email} invalid={!!errors.email}
              disabled onChange={set("email")} />
          </Field>
          <Field label="Senha" htmlFor="s-senha" hint="Mínimo de 8 caracteres" error={errors.senha}>
            <Input id="s-senha" type={show ? "text" : "password"} autoComplete="new-password" enterKeyHint="go"
              value={form.senha} invalid={!!errors.senha} onChange={set("senha")}
              affix={
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setShow(s => !s)}
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"} style={{ color: "var(--muted-foreground)" }}>
                  <Icon name={show ? "eye-off" : "eye"} size={18} basePath={ICONS_S} />
                </Button>
              } />
          </Field>
          <Field error={errors.aceite}>
            <Checkbox label="Aceito os termos de uso e a política de privacidade"
              checked={aceite} onChange={e => setAceite(e.target.checked)} />
          </Field>
          <Button type="submit" size="lg" block loading={loading}>{loading ? "Criando conta…" : "Criar conta"}</Button>
        </form>
      </CardContent>
      <CardFooter style={{ justifyContent: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)" }}>
        <span style={{ color: "var(--muted-foreground)" }}>Já tem conta?</span>
        <Button variant="link" onClick={onLogin}>Entrar</Button>
      </CardFooter>
    </Card>
  );
}
Object.assign(window, { SignupScreen });

})();
