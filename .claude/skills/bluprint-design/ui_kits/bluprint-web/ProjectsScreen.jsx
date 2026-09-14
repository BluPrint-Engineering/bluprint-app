(() => {
const { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Input, Field, Checkbox, Alert, Spinner, Logo, Icon } = window.BluPrintDesignSystem_d4fa62;
const ICONS_P = "../../assets/icons";

const PROJECTS = [
  { name: "Casa Moinhos", org: "Melnick", role: "gerente de obra", pend: 42 },
  { name: "Torre Jardins", org: "Melnick", role: "assistente de obra", pend: 8 },
];

/** Post-login root (RF-134). Minimal on purpose: the obra list is issue #45, not #42/#43. */
function ProjectsScreen({ email, empty, onToggleEmpty, onLogout }) {
  const list = empty ? [] : PROJECTS;
  return (
    <div style={{ minHeight: "100dvh", background: "var(--muted)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", padding: "var(--space-3) var(--page-pad)", background: "var(--background)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0 }}>
        <Logo size={28} wordmark basePath="../../assets" />
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Button variant="ghost" size="sm" onClick={onToggleEmpty}>{empty ? "Ver com obras" : "Ver estado vazio"}</Button>
          <Button variant="ghost" size="icon" aria-label="Sair" onClick={onLogout} style={{ color: "var(--muted-foreground)" }}>
            <Icon name="log-out" size={20} basePath={ICONS_P} />
          </Button>
        </div>
      </header>
      <div style={{ maxWidth: "var(--content-max-wide)", margin: "0 auto", padding: "var(--page-pad)", display: "grid", gap: "var(--space-4)" }}>
        <div>
          <h1>Obras</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "var(--text-sm)" }}>{email}</p>
        </div>
        {list.length === 0 ? (
          <Card>
            <CardContent style={{ display: "grid", gap: "var(--space-3)", justifyItems: "start", padding: "var(--space-6) var(--card-spacing)" }}>
              <span style={{ color: "var(--primary)" }}><Icon name="building" size={32} basePath={ICONS_P} /></span>
              <CardTitle>Nenhuma obra por aqui</CardTitle>
              <CardDescription>Você verá uma obra aqui quando o admin da construtora te vincular a ela.</CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div style={{ display: "grid", gap: "var(--space-3)", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
            {list.map(p => (
              <Card key={p.name}>
                <CardHeader>
                  <CardTitle>{p.name}</CardTitle>
                  <CardDescription>{p.org} · {p.role}</CardDescription>
                </CardHeader>
                <CardContent style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--muted-foreground)" }}>
                  <span>{p.pend} pendências abertas</span>
                  <Icon name="chevron-right" size={20} basePath={ICONS_P} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
Object.assign(window, { ProjectsScreen });

})();
