(() => {
const { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Input, Field, Checkbox, Alert, Spinner, Logo, Icon } = window.BluPrintDesignSystem_d4fa62;

/** RF-130: an invited person without an account finishes signup and is then asked to accept. */
function InviteDialog({ invite, onAccept, onDecline }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--overlay)", display: "grid", placeItems: "center", padding: "var(--space-4)", zIndex: 10 }}>
      <Card raised style={{ width: "100%", maxWidth: "var(--content-max)" }}>
        <CardHeader>
          <CardTitle>Aceitar o convite?</CardTitle>
          <CardDescription>
            {invite.org} te convidou para a obra <strong>{invite.project}</strong> como <strong>{invite.role}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent style={{ color: "var(--muted-foreground)", fontSize: "var(--text-sm)" }}>
          O convite expira em 7 dias e vale uma única vez.
        </CardContent>
        <CardFooter style={{ gap: "var(--space-3)" }}>
          <Button variant="outline" block onClick={onDecline}>Recusar</Button>
          <Button block onClick={onAccept}>Aceitar</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
Object.assign(window, { InviteDialog });

})();
