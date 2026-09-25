/* @ds-bundle: {"format":4,"namespace":"BluPrintDesignSystem_d4fa62","components":[{"name":"Logo","sourcePath":"components/brand/Logo.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"CardHeader","sourcePath":"components/core/Card.jsx"},{"name":"CardTitle","sourcePath":"components/core/Card.jsx"},{"name":"CardDescription","sourcePath":"components/core/Card.jsx"},{"name":"CardContent","sourcePath":"components/core/Card.jsx"},{"name":"CardFooter","sourcePath":"components/core/Card.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"Spinner","sourcePath":"components/feedback/Spinner.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Label","sourcePath":"components/forms/Label.jsx"}],"sourceHashes":{"components/brand/Logo.jsx":"98ea617308bb","components/core/Button.jsx":"35515bb15167","components/core/Card.jsx":"77b0a85aa121","components/core/Icon.jsx":"48f28aeb87ff","components/feedback/Alert.jsx":"7b881d675d2e","components/feedback/Spinner.jsx":"f487984cabe4","components/forms/Checkbox.jsx":"772c9a861f74","components/forms/Field.jsx":"ce08676a3c7a","components/forms/Input.jsx":"09a4bcb10891","components/forms/Label.jsx":"887ef842b370","ui_kits/bluprint-web/AuthShell.jsx":"055db518a4a0","ui_kits/bluprint-web/InviteDialog.jsx":"3cf2efd9ce97","ui_kits/bluprint-web/LoginScreen.jsx":"030737648769","ui_kits/bluprint-web/ProjectsScreen.jsx":"d9675eac4d31","ui_kits/bluprint-web/SignupScreen.jsx":"ef95d912c620","ui_kits/bluprint-web/app.jsx":"1859a325fea9","ui_kits/bluprint-web/ios-frame.jsx":"24642b887be3"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.BluPrintDesignSystem_d4fa62 = window.BluPrintDesignSystem_d4fa62 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const MARK = {
  gradient: "logo-mark.svg",
  blue: "logo-mark-blue.svg",
  white: "logo-mark-white.svg",
  ink: "logo-mark-ink.svg"
};
const LOCKUP = {
  gradient: "logo-lockup.svg",
  blue: "logo-lockup-blue.svg",
  white: "logo-lockup-white.svg",
  ink: "logo-lockup-ink.svg"
};
const STACKED = {
  gradient: "logo-stacked.svg",
  blue: "logo-stacked.svg",
  white: "logo-stacked-white.svg",
  ink: "logo-stacked-ink.svg"
};
function Logo({
  tone = "gradient",
  size = 40,
  wordmark = false,
  stacked = false,
  basePath = "assets",
  className = "",
  style = {},
  ...rest
}) {
  const set = stacked ? STACKED : wordmark ? LOCKUP : MARK;
  const src = set[tone] || set.gradient;
  // Stacked art scales from the mark's height; the lockup's viewBox is already mark-height tall.
  const height = stacked ? size * 1.63 : size;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `bp-logo ${className}`,
    style: style
  }, rest), /*#__PURE__*/React.createElement("img", {
    src: `${basePath}/${src}`,
    alt: "BluPrint",
    style: {
      height,
      width: "auto"
    }
  }));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Logo.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: "bp-btn--sm",
  md: "bp-btn--md",
  lg: "bp-btn--lg",
  icon: "bp-btn--icon",
  "icon-sm": "bp-btn--icon-sm"
};
function Button({
  variant = "default",
  size = "md",
  block = false,
  loading = false,
  iconStart = null,
  iconEnd = null,
  as = "button",
  className = "",
  children,
  ...rest
}) {
  const Comp = as;
  const cls = ["bp-btn", `bp-btn--${variant}`, SIZES[size] || SIZES.md, block ? "bp-btn--block" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement(Comp, _extends({
    className: cls,
    "data-variant": variant,
    "data-size": size,
    disabled: rest.disabled || loading,
    "aria-busy": loading || undefined
  }, rest), loading ? /*#__PURE__*/React.createElement("span", {
    className: "bp-spinner",
    style: {
      width: "1.15em",
      height: "1.15em"
    },
    "aria-hidden": "true"
  }) : iconStart, children, iconEnd);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  size = "default",
  raised = false,
  className = "",
  children,
  ...rest
}) {
  const cls = ["bp-card", size === "sm" ? "bp-card--sm" : "", raised ? "bp-card--raised" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    "data-size": size
  }, rest), children);
}
function CardHeader({
  className = "",
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `bp-card__header ${className}`
  }, rest), children);
}
function CardTitle({
  className = "",
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `bp-card__title ${className}`
  }, rest), children);
}
function CardDescription({
  className = "",
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `bp-card__desc ${className}`
  }, rest), children);
}
function CardContent({
  className = "",
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `bp-card__content ${className}`
  }, rest), children);
}
function CardFooter({
  className = "",
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `bp-card__footer ${className}`
  }, rest), children);
}
Object.assign(__ds_scope, { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Lucide glyph rendered as a mask, so it inherits currentColor like lucide-react does in the app. */
function Icon({
  name,
  size = 20,
  basePath = "assets/icons",
  className = "",
  style = {},
  ...rest
}) {
  const url = `url("${basePath}/${name}.svg")`;
  return /*#__PURE__*/React.createElement("span", _extends({
    "aria-hidden": "true",
    className: className,
    style: {
      display: "inline-block",
      width: size,
      height: size,
      flexShrink: 0,
      background: "currentColor",
      WebkitMaskImage: url,
      maskImage: url,
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
      WebkitMaskSize: "contain",
      maskSize: "contain",
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Alert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const ICONS = {
  danger: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8v4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 16h.01"
  })),
  info: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 11v5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8h.01"
  })),
  success: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m8.5 12.5 2.5 2.5 4.5-5"
  }))
};
function Alert({
  tone = "danger",
  title,
  children,
  className = "",
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `bp-alert bp-alert--${tone} ${className}`,
    role: tone === "danger" ? "alert" : "status"
  }, rest), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, ICONS[tone]), /*#__PURE__*/React.createElement("div", null, title ? /*#__PURE__*/React.createElement("div", {
    className: "bp-alert__title"
  }, title) : null, children));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Alert.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Spinner.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Spinner({
  size = 20,
  label = "Carregando…",
  className = "",
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `bp-spinner ${className}`,
    style: {
      width: size,
      height: size
    },
    role: "status",
    "aria-label": label
  }, rest));
}
Object.assign(__ds_scope, { Spinner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Spinner.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  label,
  description,
  className = "",
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    className: `bp-checkbox ${className}`
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox"
  }, rest)), /*#__PURE__*/React.createElement("span", null, label, description ? /*#__PURE__*/React.createElement("span", {
    className: "bp-hint",
    style: {
      display: "block"
    }
  }, description) : null));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  invalid = false,
  affix = null,
  className = "",
  ...rest
}) {
  const input = /*#__PURE__*/React.createElement("input", _extends({
    className: ["bp-input", invalid ? "bp-input--invalid" : "", affix ? "bp-input--with-affix" : "", className].filter(Boolean).join(" "),
    "aria-invalid": invalid || undefined
  }, rest));
  if (!affix) return input;
  return /*#__PURE__*/React.createElement("span", {
    className: "bp-input-wrap"
  }, input, /*#__PURE__*/React.createElement("span", {
    className: "bp-input-affix"
  }, affix));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Label.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Label({
  optional = false,
  className = "",
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", _extends({
    className: `bp-label ${className}`
  }, rest), children, optional ? /*#__PURE__*/React.createElement("span", {
    className: "bp-label__optional"
  }, " (opcional)") : null);
}
Object.assign(__ds_scope, { Label });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Label.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Field({
  label,
  htmlFor,
  optional = false,
  hint,
  error,
  children,
  className = "",
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `bp-field ${className}`
  }, rest), label ? /*#__PURE__*/React.createElement(__ds_scope.Label, {
    htmlFor: htmlFor,
    optional: optional
  }, label) : null, children, hint && !error ? /*#__PURE__*/React.createElement("span", {
    className: "bp-hint"
  }, hint) : null, error ? /*#__PURE__*/React.createElement("span", {
    className: "bp-error",
    role: "alert"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8v4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 16h.01"
  })), error) : null);
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bluprint-web/AuthShell.jsx
try { (() => {
(() => {
  const {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    Input,
    Field,
    Checkbox,
    Alert,
    Spinner,
    Logo,
    Icon
  } = window.BluPrintDesignSystem_d4fa62;
  const A = "../../assets";
  function ThemeToggle() {
    // __bpThemeOverride lets a preview (loading.html) pin the theme WITHOUT touching the
    // "bp-theme" key the real screens read — previewing must not change the user's setting.
    const override = window.__bpThemeOverride;
    const [dark, setDark] = React.useState(() => override != null ? override === "dark" : localStorage.getItem("bp-theme") === "dark");
    React.useEffect(() => {
      document.documentElement.classList.toggle("dark", dark);
      document.body.classList.toggle("dark", dark);
      if (override == null) localStorage.setItem("bp-theme", dark ? "dark" : "light");
    }, [dark, override]);
    return /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "icon",
      onClick: () => setDark(d => !d),
      "aria-label": dark ? "Usar tema claro" : "Usar tema escuro",
      style: {
        color: "inherit"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: dark ? "sun" : "moon",
      size: 22,
      basePath: A + "/icons"
    }));
  }

  /** Mobile: brand band on top, form below. Desktop (>=900px): brand panel left, form right. */
  function AuthShell({
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "auth"
    }, /*#__PURE__*/React.createElement("aside", {
      className: "auth__brand"
    }, /*#__PURE__*/React.createElement("header", {
      className: "auth__bar"
    }, /*#__PURE__*/React.createElement(ThemeToggle, null)), /*#__PURE__*/React.createElement("span", {
      className: "auth__badge",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("img", {
      className: "auth__badge-mark auth__badge-mark--light",
      src: A + "/logo-mark.svg",
      alt: ""
    }), /*#__PURE__*/React.createElement("img", {
      className: "auth__badge-mark auth__badge-mark--dark",
      src: A + "/logo-mark-white.svg",
      alt: ""
    })), /*#__PURE__*/React.createElement("img", {
      className: "auth__lockup auth__lockup--stacked",
      src: A + "/wordmark-white.svg",
      alt: "BluPrint",
      "data-comment-anchor": "b9440276d7-img-26-9"
    }), /*#__PURE__*/React.createElement("img", {
      className: "auth__lockup auth__lockup--row",
      src: A + "/logo-lockup-white.svg",
      alt: "BluPrint"
    }), /*#__PURE__*/React.createElement("p", {
      className: "auth__tagline"
    }, "Pend\xEAncias da obra mapeadas com pins sobre plantas, por unidade e por disciplina.")), /*#__PURE__*/React.createElement("main", {
      className: "auth__main"
    }, /*#__PURE__*/React.createElement("div", {
      className: "auth__slot"
    }, children)));
  }
  Object.assign(window, {
    AuthShell,
    ThemeToggle
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bluprint-web/AuthShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bluprint-web/InviteDialog.jsx
try { (() => {
(() => {
  const {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    Input,
    Field,
    Checkbox,
    Alert,
    Spinner,
    Logo,
    Icon
  } = window.BluPrintDesignSystem_d4fa62;

  /** RF-130: an invited person without an account finishes signup and is then asked to accept. */
  function InviteDialog({
    invite,
    onAccept,
    onDecline
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "var(--overlay)",
        display: "grid",
        placeItems: "center",
        padding: "var(--space-4)",
        zIndex: 10
      }
    }, /*#__PURE__*/React.createElement(Card, {
      raised: true,
      style: {
        width: "100%",
        maxWidth: "var(--content-max)"
      }
    }, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, "Aceitar o convite?"), /*#__PURE__*/React.createElement(CardDescription, null, invite.org, " te convidou para a obra ", /*#__PURE__*/React.createElement("strong", null, invite.project), " como ", /*#__PURE__*/React.createElement("strong", null, invite.role), ".")), /*#__PURE__*/React.createElement(CardContent, {
      style: {
        color: "var(--muted-foreground)",
        fontSize: "var(--text-sm)"
      }
    }, "O convite expira em 7 dias e vale uma \xFAnica vez."), /*#__PURE__*/React.createElement(CardFooter, {
      style: {
        gap: "var(--space-3)"
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      block: true,
      onClick: onDecline
    }, "Recusar"), /*#__PURE__*/React.createElement(Button, {
      block: true,
      onClick: onAccept
    }, "Aceitar"))));
  }
  Object.assign(window, {
    InviteDialog
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bluprint-web/InviteDialog.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bluprint-web/LoginScreen.jsx
try { (() => {
(() => {
  const {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    Input,
    Field,
    Checkbox,
    Alert,
    Spinner,
    Logo,
    Icon
  } = window.BluPrintDesignSystem_d4fa62;
  const ICONS = "../../assets/icons";
  function LoginScreen({
    onDone,
    forceLoading = false
  }) {
    const [email, setEmail] = React.useState("");
    const [senha, setSenha] = React.useState("");
    const [show, setShow] = React.useState(false);
    const [errors, setErrors] = React.useState({});
    const [apiError, setApiError] = React.useState(null);
    const [loading, setLoading] = React.useState(!!forceLoading);
    function submit(e) {
      e.preventDefault();
      const next = {};
      if (!email.trim()) next.email = "Informe o seu e-mail.";else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) next.email = "Informe um e-mail válido.";
      if (!senha) next.senha = "Informe a sua senha.";
      setErrors(next);
      setApiError(null);
      if (Object.keys(next).length) return;
      setLoading(true);
      // Demo: the API answers with a problem code; the client translates it (never shows API text).
      setTimeout(() => {
        setLoading(false);
        if (senha === "obra1234") onDone(email);else setApiError("E-mail ou senha incorretos.");
      }, 900);
    }
    return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, {
      style: {
        fontSize: "var(--text-2xl)"
      }
    }, "Entrar"), /*#__PURE__*/React.createElement(CardDescription, null, "Entre com seu e-mail e senha.")), /*#__PURE__*/React.createElement(CardContent, null, /*#__PURE__*/React.createElement("form", {
      onSubmit: submit,
      noValidate: true,
      style: {
        display: "grid",
        gap: "var(--form-gap)"
      }
    }, apiError ? /*#__PURE__*/React.createElement(Alert, {
      tone: "danger",
      title: "N\xE3o foi poss\xEDvel entrar"
    }, apiError) : null, /*#__PURE__*/React.createElement(Field, {
      label: "E-mail",
      htmlFor: "email",
      error: errors.email
    }, /*#__PURE__*/React.createElement(Input, {
      id: "email",
      type: "email",
      inputMode: "email",
      autoComplete: "email",
      enterKeyHint: "next",
      placeholder: "voce@construtora.com.br",
      value: email,
      invalid: !!errors.email,
      onChange: e => setEmail(e.target.value)
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Senha",
      htmlFor: "senha",
      error: errors.senha
    }, /*#__PURE__*/React.createElement(Input, {
      id: "senha",
      type: show ? "text" : "password",
      autoComplete: "current-password",
      enterKeyHint: "go",
      placeholder: "Sua senha",
      value: senha,
      invalid: !!errors.senha,
      onChange: e => setSenha(e.target.value),
      affix: /*#__PURE__*/React.createElement(Button, {
        type: "button",
        variant: "ghost",
        size: "icon-sm",
        onClick: () => setShow(s => !s),
        "aria-label": show ? "Ocultar senha" : "Mostrar senha",
        style: {
          color: "var(--muted-foreground)"
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: show ? "eye-off" : "eye",
        size: 18,
        basePath: ICONS
      }))
    })), /*#__PURE__*/React.createElement(Button, {
      type: "submit",
      size: "lg",
      block: true,
      loading: loading
    }, loading ? "Entrando…" : "Entrar"))), /*#__PURE__*/React.createElement(CardFooter, {
      style: {
        justifyContent: "center",
        textAlign: "center",
        fontSize: "var(--text-sm)",
        color: "var(--muted-foreground)",
        textWrap: "pretty"
      }
    }, "N\xE3o tem conta? O acesso \xE9 por convite da sua construtora."));
  }
  Object.assign(window, {
    LoginScreen
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bluprint-web/LoginScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bluprint-web/ProjectsScreen.jsx
try { (() => {
(() => {
  const {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    Input,
    Field,
    Checkbox,
    Alert,
    Spinner,
    Logo,
    Icon
  } = window.BluPrintDesignSystem_d4fa62;
  const ICONS_P = "../../assets/icons";
  const PROJECTS = [{
    name: "Casa Moinhos",
    org: "Melnick",
    role: "gerente de obra",
    pend: 42
  }, {
    name: "Torre Jardins",
    org: "Melnick",
    role: "assistente de obra",
    pend: 8
  }];

  /** Post-login root (RF-134). Minimal on purpose: the obra list is issue #45, not #42/#43. */
  function ProjectsScreen({
    email,
    empty,
    onToggleEmpty,
    onLogout
  }) {
    const list = empty ? [] : PROJECTS;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: "100dvh",
        background: "var(--muted)"
      }
    }, /*#__PURE__*/React.createElement("header", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-3)",
        padding: "var(--space-3) var(--page-pad)",
        background: "var(--background)",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0
      }
    }, /*#__PURE__*/React.createElement(Logo, {
      size: 28,
      wordmark: true,
      basePath: "../../assets"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)"
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      onClick: onToggleEmpty
    }, empty ? "Ver com obras" : "Ver estado vazio"), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "icon",
      "aria-label": "Sair",
      onClick: onLogout,
      style: {
        color: "var(--muted-foreground)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "log-out",
      size: 20,
      basePath: ICONS_P
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: "var(--content-max-wide)",
        margin: "0 auto",
        padding: "var(--page-pad)",
        display: "grid",
        gap: "var(--space-4)"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Obras"), /*#__PURE__*/React.createElement("p", {
      style: {
        color: "var(--muted-foreground)",
        fontSize: "var(--text-sm)"
      }
    }, email)), list.length === 0 ? /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardContent, {
      style: {
        display: "grid",
        gap: "var(--space-3)",
        justifyItems: "start",
        padding: "var(--space-6) var(--card-spacing)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--primary)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "building",
      size: 32,
      basePath: ICONS_P
    })), /*#__PURE__*/React.createElement(CardTitle, null, "Nenhuma obra por aqui"), /*#__PURE__*/React.createElement(CardDescription, null, "Voc\xEA ver\xE1 uma obra aqui quando o admin da construtora te vincular a ela."))) : /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gap: "var(--space-3)",
        gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))"
      }
    }, list.map(p => /*#__PURE__*/React.createElement(Card, {
      key: p.name
    }, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, p.name), /*#__PURE__*/React.createElement(CardDescription, null, p.org, " \xB7 ", p.role)), /*#__PURE__*/React.createElement(CardContent, {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        color: "var(--muted-foreground)"
      }
    }, /*#__PURE__*/React.createElement("span", null, p.pend, " pend\xEAncias abertas"), /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-right",
      size: 20,
      basePath: ICONS_P
    })))))));
  }
  Object.assign(window, {
    ProjectsScreen
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bluprint-web/ProjectsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bluprint-web/SignupScreen.jsx
try { (() => {
(() => {
  const {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    Input,
    Field,
    Checkbox,
    Alert,
    Spinner,
    Logo,
    Icon
  } = window.BluPrintDesignSystem_d4fa62;
  const ICONS_S = "../../assets/icons";

  /** #43 — reachable only from the invite link (RF-106, RF-130). `invite` is required. */
  function SignupScreen({
    invite,
    onLogin,
    onDone,
    forceLoading = false
  }) {
    const [form, setForm] = React.useState({
      nome: "",
      email: invite.email,
      senha: ""
    });
    const [aceite, setAceite] = React.useState(false);
    const [show, setShow] = React.useState(false);
    const [errors, setErrors] = React.useState({});
    const [loading, setLoading] = React.useState(!!forceLoading);
    const set = k => e => setForm(f => ({
      ...f,
      [k]: e.target.value
    }));
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
      setTimeout(() => {
        setLoading(false);
        onDone(form);
      }, 900);
    }
    return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, {
      style: {
        fontSize: "var(--text-2xl)"
      }
    }, "Criar conta"), /*#__PURE__*/React.createElement(CardDescription, null, "Sua conta \xE9 \xFAnica. O papel em cada obra vem do convite.")), /*#__PURE__*/React.createElement(CardContent, null, /*#__PURE__*/React.createElement("form", {
      onSubmit: submit,
      noValidate: true,
      style: {
        display: "grid",
        gap: "var(--form-gap)"
      }
    }, /*#__PURE__*/React.createElement(Alert, {
      tone: "info",
      title: `Convite de ${invite.org}`
    }, "Obra ", invite.project, " \xB7 ", invite.role, ". Ao concluir o cadastro voc\xEA confirma o convite."), /*#__PURE__*/React.createElement(Field, {
      label: "Nome completo",
      htmlFor: "nome",
      error: errors.nome
    }, /*#__PURE__*/React.createElement(Input, {
      id: "nome",
      autoComplete: "name",
      enterKeyHint: "next",
      placeholder: "Como aparece nos relat\xF3rios",
      value: form.nome,
      invalid: !!errors.nome,
      onChange: set("nome")
    })), /*#__PURE__*/React.createElement(Field, {
      label: "E-mail",
      htmlFor: "s-email",
      error: errors.email,
      hint: "O convite foi enviado para este e-mail."
    }, /*#__PURE__*/React.createElement(Input, {
      id: "s-email",
      type: "email",
      inputMode: "email",
      autoComplete: "email",
      enterKeyHint: "next",
      placeholder: "voce@construtora.com.br",
      value: form.email,
      invalid: !!errors.email,
      disabled: true,
      onChange: set("email")
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Senha",
      htmlFor: "s-senha",
      hint: "M\xEDnimo de 8 caracteres",
      error: errors.senha
    }, /*#__PURE__*/React.createElement(Input, {
      id: "s-senha",
      type: show ? "text" : "password",
      autoComplete: "new-password",
      enterKeyHint: "go",
      value: form.senha,
      invalid: !!errors.senha,
      onChange: set("senha"),
      affix: /*#__PURE__*/React.createElement(Button, {
        type: "button",
        variant: "ghost",
        size: "icon-sm",
        onClick: () => setShow(s => !s),
        "aria-label": show ? "Ocultar senha" : "Mostrar senha",
        style: {
          color: "var(--muted-foreground)"
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: show ? "eye-off" : "eye",
        size: 18,
        basePath: ICONS_S
      }))
    })), /*#__PURE__*/React.createElement(Field, {
      error: errors.aceite
    }, /*#__PURE__*/React.createElement(Checkbox, {
      label: "Aceito os termos de uso e a pol\xEDtica de privacidade",
      checked: aceite,
      onChange: e => setAceite(e.target.checked)
    })), /*#__PURE__*/React.createElement(Button, {
      type: "submit",
      size: "lg",
      block: true,
      loading: loading
    }, loading ? "Criando conta…" : "Criar conta"))), /*#__PURE__*/React.createElement(CardFooter, {
      style: {
        justifyContent: "center",
        gap: "var(--space-2)",
        fontSize: "var(--text-sm)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--muted-foreground)"
      }
    }, "J\xE1 tem conta?"), /*#__PURE__*/React.createElement(Button, {
      variant: "link",
      onClick: onLogin
    }, "Entrar")));
  }
  Object.assign(window, {
    SignupScreen
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bluprint-web/SignupScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bluprint-web/app.jsx
try { (() => {
(() => {
  const {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    Input,
    Field,
    Checkbox,
    Alert,
    Spinner,
    Logo,
    Icon
  } = window.BluPrintDesignSystem_d4fa62;
  const {
    AuthShell,
    LoginScreen,
    SignupScreen,
    InviteDialog,
    ProjectsScreen
  } = window;
  const INVITE = {
    org: "Melnick",
    project: "Casa Moinhos",
    role: "assistente de obra",
    email: "gui@melnick.com.br"
  };
  function App({
    start = "session"
  }) {
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
      return /*#__PURE__*/React.createElement("div", {
        style: {
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          gap: "var(--space-3)",
          background: "var(--background)"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "grid",
          justifyItems: "center",
          gap: "var(--space-4)",
          color: "var(--muted-foreground)"
        }
      }, /*#__PURE__*/React.createElement("img", {
        src: "../../assets/logo-mark.svg",
        alt: "",
        style: {
          height: 48
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          fontSize: "var(--text-sm)"
        }
      }, /*#__PURE__*/React.createElement(Spinner, {
        size: 18
      }), " Verificando sua sess\xE3o\u2026")));
    }
    if (screen === "app") {
      return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ProjectsScreen, {
        email: email,
        empty: empty,
        onToggleEmpty: () => setEmpty(e => !e),
        onLogout: () => setScreen("login")
      }), invite ? /*#__PURE__*/React.createElement(InviteDialog, {
        invite: invite,
        onAccept: () => {
          setInvite(null);
          setEmpty(false);
        },
        onDecline: () => {
          setInvite(null);
          setEmpty(true);
        }
      }) : null);
    }
    return /*#__PURE__*/React.createElement(AuthShell, null, screen === "login" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(LoginScreen, {
      onDone: e => {
        setEmail(e);
        setScreen("app");
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "fixed",
        right: "var(--space-4)",
        bottom: "var(--space-4)",
        zIndex: 5
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      size: "sm",
      onClick: () => setScreen("signup"),
      style: {
        borderStyle: "dashed"
      }
    }, "Demo \xB7 abrir link do convite"))) : /*#__PURE__*/React.createElement(SignupScreen, {
      invite: INVITE,
      onLogin: () => setScreen("login"),
      onDone: form => {
        setEmail(form.email);
        setInvite(INVITE);
        setScreen("app");
      }
    }));
  }
  Object.assign(window, {
    App
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bluprint-web/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/bluprint-web/ios-frame.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).

/* BEGIN USAGE */
// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports (to window): IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard
//
// Usage — wrap your screen content in <IOSDevice> to get the bezel, status bar
// and home indicator (props: title, dark, keyboard):
//
//   <IOSDevice title="Settings">
//     ...your screen content...
//   </IOSDevice>
//   <IOSDevice dark title="Search" keyboard>…</IOSDevice>
/* END USAGE */

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({
  dark = false,
  time = '9:41'
}) {
  const c = dark ? '#fff' : '#000';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 154,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '21px 24px 19px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 20,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '-apple-system, "SF Pro", system-ui',
      fontWeight: 590,
      fontSize: 17,
      lineHeight: '22px',
      color: c
    }
  }, time)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingTop: 1,
      paddingRight: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "12",
    viewBox: "0 0 19 12"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7.5",
    width: "3.2",
    height: "4.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.8",
    y: "5",
    width: "3.2",
    height: "7",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.6",
    y: "2.5",
    width: "3.2",
    height: "9.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.4",
    y: "0",
    width: "3.2",
    height: "12",
    rx: "0.7",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "12",
    viewBox: "0 0 17 12"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "10.5",
    r: "1.5",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "27",
    height: "13",
    viewBox: "0 0 27 13"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "23",
    height: "12",
    rx: "3.5",
    stroke: c,
    strokeOpacity: "0.35",
    fill: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "9",
    rx: "2",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z",
    fill: c,
    fillOpacity: "0.4"
  }))));
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({
  children,
  dark = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      minWidth: 44,
      borderRadius: 9999,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: dark ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({
  title = 'Title',
  dark = false,
  trailingIcon = true
}) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = content => /*#__PURE__*/React.createElement(IOSGlassPill, {
    dark: dark
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, content));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      paddingTop: 62,
      paddingBottom: 10,
      position: 'relative',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }
  }, pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "20",
    viewBox: "0 0 12 20",
    fill: "none",
    style: {
      marginLeft: -1
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 2L2 10l8 8",
    stroke: muted,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), trailingIcon && pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "6",
    viewBox: "0 0 22 6"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "3",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "3",
    r: "2.5",
    fill: muted
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px',
      fontFamily: '-apple-system, system-ui',
      fontSize: 34,
      fontWeight: 700,
      lineHeight: '41px',
      color: text,
      letterSpacing: 0.4
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({
  title,
  detail,
  icon,
  chevron = true,
  isLast = false,
  dark = false
}) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 52,
      padding: '0 16px',
      position: 'relative',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      letterSpacing: -0.43
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 7,
      background: icon,
      marginRight: 12,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      color: text
    }
  }, title), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      color: sec,
      marginRight: 6
    }
  }, detail), chevron && /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "14",
    viewBox: "0 0 8 14",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1l6 6-6 6",
    stroke: ter,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), !isLast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: icon ? 58 : 16,
      height: 0.5,
      background: sep
    }
  }));
}
function IOSList({
  header,
  children,
  dark = false
}) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return /*#__PURE__*/React.createElement("div", null, header && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '-apple-system, system-ui',
      fontSize: 13,
      color: hc,
      textTransform: 'uppercase',
      padding: '8px 36px 6px',
      letterSpacing: -0.08
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 26,
      margin: '0 16px',
      overflow: 'hidden'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
  title,
  keyboard = false
}) {
  return (
    /*#__PURE__*/
    // data-om-starter: inert presence marker — Claude Design's starter-usage
    // probe reads it; it renders nothing. Keep it on this root element.
    React.createElement("div", {
      "data-om-starter": "ios-frame",
      style: {
        width,
        height,
        borderRadius: 48,
        overflow: 'hidden',
        position: 'relative',
        background: dark ? '#000' : '#F2F2F7',
        boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
        fontFamily: '-apple-system, system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 11,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 126,
        height: 37,
        borderRadius: 24,
        background: '#000',
        zIndex: 50
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10
      }
    }, /*#__PURE__*/React.createElement(IOSStatusBar, {
      dark: dark
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }
    }, title !== undefined && /*#__PURE__*/React.createElement(IOSNavBar, {
      title: title,
      dark: dark
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflow: 'auto'
      }
    }, children), keyboard && /*#__PURE__*/React.createElement(IOSKeyboard, {
      dark: dark
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        height: 34,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingBottom: 8,
        pointerEvents: 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 139,
        height: 5,
        borderRadius: 100,
        background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'
      }
    })))
  );
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({
  dark = false
}) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: /*#__PURE__*/React.createElement("svg", {
      width: "19",
      height: "17",
      viewBox: "0 0 19 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z",
      fill: glyph
    })),
    del: /*#__PURE__*/React.createElement("svg", {
      width: "23",
      height: "17",
      viewBox: "0 0 23 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z",
      fill: "none",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 5l7 7M17 5l-7 7",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinecap: "round"
    })),
    ret: /*#__PURE__*/React.createElement("svg", {
      width: "20",
      height: "14",
      viewBox: "0 0 20 14"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M18 1v6H4m0 0l4-4M4 7l4 4",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))
  };
  const key = (content, {
    w,
    flex,
    ret,
    fs = 25,
    k
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      height: 42,
      borderRadius: 8.5,
      flex: flex ? 1 : undefined,
      width: w,
      minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs,
      fontWeight: 458,
      color: ret ? '#fff' : glyph
    }
  }, content);
  const row = (keys, pad = 0) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      justifyContent: 'center',
      padding: `0 ${pad}px`
    }
  }, keys.map(l => key(l, {
    flex: true,
    k: l
  })));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 15,
      borderRadius: 27,
      overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: dark ? '0 -2px 20px rgba(0,0,0,0.09)' : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      alignItems: 'center',
      padding: '8px 22px 13px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, ['"The"', 'the', 'to'].map((w, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 25,
      background: '#ccc',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      color: sugg,
      letterSpacing: -0.43,
      lineHeight: '22px'
    }
  }, w)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13,
      padding: '0 6.5px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], 20), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14.25,
      alignItems: 'center'
    }
  }, key(icons.shift, {
    w: 45,
    k: 'shift'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      flex: 1
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l, {
    flex: true,
    k: l
  }))), key(icons.del, {
    w: 45,
    k: 'del'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, key('ABC', {
    w: 92.25,
    fs: 18,
    k: 'abc'
  }), key('', {
    flex: true,
    k: 'space'
  }), key(icons.ret, {
    w: 92.25,
    ret: true,
    k: 'ret'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      width: '100%',
      position: 'relative'
    }
  }));
}
Object.assign(window, {
  IOSDevice,
  IOSStatusBar,
  IOSNavBar,
  IOSGlassPill,
  IOSList,
  IOSListRow,
  IOSKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/bluprint-web/ios-frame.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CardHeader = __ds_scope.CardHeader;

__ds_ns.CardTitle = __ds_scope.CardTitle;

__ds_ns.CardDescription = __ds_scope.CardDescription;

__ds_ns.CardContent = __ds_scope.CardContent;

__ds_ns.CardFooter = __ds_scope.CardFooter;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.Spinner = __ds_scope.Spinner;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Label = __ds_scope.Label;

})();
