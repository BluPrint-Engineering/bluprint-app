(() => {
const { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Input, Field, Checkbox, Alert, Spinner, Logo, Icon } = window.BluPrintDesignSystem_d4fa62;
const { AuthShell, LoginScreen, SignupScreen, InviteDialog, ProjectsScreen } = window;

const INVITE = { org: "Melnick", project: "Casa Moinhos", role: "assistente de obra", email: "gui@melnick.com.br" };

function App({ start = "session" }) {
  const [screen, setScreen] = React.useState(start);
  const [email, setEmail] = React.useState("");
  const [empty, setEmpty] = React.useState(false);
  const [invite, setInvite] = React.useState(null);

  // Session is read before anything paints, so no content flashes (issue #42).
  React.useEffect(() => {
    if (start !== "session") return; // "session-hold" freezes the splash for the states preview
    const t = setTimeout(() => setScreen("login"), 700);
    return () => clearTimeout(t);
  }, [start]);

  if (screen === "session" || screen === "session-hold") {
    return (
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", gap: "var(--space-3)", background: "var(--background)" }}>
        <div style={{ display: "grid", justifyItems: "center", gap: "var(--space-4)", color: "var(--muted-foreground)" }}>
          <img src="../../assets/logo-mark.svg" alt="" style={{ height: 48 }} />
          <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)" }}>
            <Spinner size={18} /> Verificando sua sessão…
          </span>
        </div>
      </div>
    );
  }

  if (screen === "app") {
    return (
      <>
        <ProjectsScreen email={email} empty={empty} onToggleEmpty={() => setEmpty(e => !e)} onLogout={() => setScreen("login")} />
        {invite ? (
          <InviteDialog invite={invite} onAccept={() => { setInvite(null); setEmpty(false); }} onDecline={() => { setInvite(null); setEmpty(true); }} />
        ) : null}
      </>
    );
  }

  return (
    <AuthShell>
      {screen === "login" ? (
        <LoginScreen onSignup={() => setScreen("signup")} onDone={e => { setEmail(e); setScreen("app"); }} />
      ) : (
        <SignupScreen invite={INVITE} onLogin={() => setScreen("login")}
          onDone={form => { setEmail(form.email); setInvite(INVITE); setScreen("app"); }} />
      )}
    </AuthShell>
  );
}
Object.assign(window, { App });

})();
