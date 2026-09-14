(() => {
const { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Input, Field, Checkbox, Alert, Spinner, Logo, Icon } = window.BluPrintDesignSystem_d4fa62;
const A = "../../assets";

function ThemeToggle() {
  // __bpThemeOverride lets a preview (loading.html) pin the theme WITHOUT touching the
  // "bp-theme" key the real screens read — previewing must not change the user's setting.
  const override = window.__bpThemeOverride;
  const [dark, setDark] = React.useState(() =>
    override != null ? override === "dark" : localStorage.getItem("bp-theme") === "dark");
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.body.classList.toggle("dark", dark);
    if (override == null) localStorage.setItem("bp-theme", dark ? "dark" : "light");
  }, [dark, override]);
  return (
    <Button variant="ghost" size="icon" onClick={() => setDark(d => !d)} aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
      style={{ color: "inherit" }}>
      <Icon name={dark ? "sun" : "moon"} size={22} basePath={A + "/icons"} />
    </Button>
  );
}

/** Mobile: brand band on top, form below. Desktop (>=900px): brand panel left, form right. */
function AuthShell({ children }) {
  return (
    <div className="auth">
      <aside className="auth__brand">
        <header className="auth__bar"><ThemeToggle /></header>
        <span className="auth__badge" aria-hidden="true">
          <img className="auth__badge-mark auth__badge-mark--light" src={A + "/logo-mark.svg"} alt="" />
          <img className="auth__badge-mark auth__badge-mark--dark" src={A + "/logo-mark-white.svg"} alt="" />
        </span>
        <img className="auth__lockup auth__lockup--stacked" src={A + "/wordmark-white.svg"} alt="BluPrint" />
        <img className="auth__lockup auth__lockup--row" src={A + "/logo-lockup-white.svg"} alt="BluPrint" />
        <p className="auth__tagline">Pendências da obra mapeadas com pins sobre plantas, por unidade e por disciplina.</p>
      </aside>
      <main className="auth__main">
        <div className="auth__slot">{children}</div>
      </main>
    </div>
  );
}

Object.assign(window, { AuthShell, ThemeToggle });

})();
