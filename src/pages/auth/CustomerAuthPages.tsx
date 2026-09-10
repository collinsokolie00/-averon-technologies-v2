import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { CheckCircle2, KeyRound, Mail, ShieldCheck, UserPlus } from "lucide-react";

import { useCustomerAuth } from "../../contexts/useCustomerAuth";

type AuthMode = "login" | "register" | "forgot" | "verify";

export function CustomerAuthPage({ mode }: { mode: AuthMode }) {
  const auth = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/account";
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);

    try {
      if (mode === "login") {
        await auth.login(String(form.get("email")), String(form.get("password")));
        navigate(from, { replace: true });
      }
      if (mode === "register") {
        await auth.register({
          name: String(form.get("name")),
          company: String(form.get("company")),
          email: String(form.get("email")),
          password: String(form.get("password")),
        });
        navigate("/verify-email", { replace: true });
      }
      if (mode === "forgot") {
        await auth.sendPasswordReset(String(form.get("email")));
        setSuccess("Password reset instructions were sent if an account exists for that email.");
      }
      if (mode === "verify") {
        await auth.verifyEmail();
        setSuccess("Verification email sent. Check your inbox, then return to your account.");
        window.setTimeout(() => navigate("/account", { replace: true }), 500);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    }
  }

  const copy = {
    login: {
      icon: KeyRound,
      eyebrow: "Customer login",
      title: "Access your Averon account.",
      detail: "Quote requests, contact forms, contracts, and portal access require a customer session.",
      button: "Login",
    },
    register: {
      icon: UserPlus,
      eyebrow: "Create account",
      title: "Start a secure client profile.",
      detail: "Create your Firebase-secured customer profile for quotes, contracts, and workspace access.",
      button: "Create account",
    },
    forgot: {
      icon: Mail,
      eyebrow: "Password recovery",
      title: "Reset your password.",
      detail: "Firebase will send password reset instructions to your email address.",
      button: "Send reset email",
    },
    verify: {
      icon: ShieldCheck,
      eyebrow: "Verify email",
      title: "Confirm your customer account.",
      detail: "Send a Firebase verification email to the current customer account.",
      button: "Send verification email",
    },
  }[mode];

  const Icon = copy.icon;

  if (mode === "login" && auth.user) {
    return <Navigate to={from} replace />;
  }

  return (
    <section className="auth-page">
      <div className="auth-visual">
        <span className="auth-icon">
          <Icon size={22} />
        </span>
        <p>{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <span>{copy.detail}</span>
      </div>

      <form className="auth-card" onSubmit={handleSubmit}>
        <div>
          <p className="section-kicker">{copy.eyebrow}</p>
          <h2>{copy.title}</h2>
        </div>

        {mode === "register" && (
          <>
            <label>
              Full name
              <input name="name" minLength={2} required autoComplete="name" placeholder="Your name" />
            </label>
            <label>
              Company
              <input name="company" autoComplete="organization" placeholder="Company name" />
            </label>
          </>
        )}

        {mode !== "verify" && (
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
          </label>
        )}

        {(mode === "login" || mode === "register") && (
          <label>
            Password
            <input name="password" type="password" minLength={mode === "register" ? 8 : 6} required autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </label>
        )}

        {(error || auth.initializationError) && <p className="form-alert error">{error || auth.initializationError}</p>}
        {success && (
          <p className="form-alert success">
            <CheckCircle2 size={16} />
            {success}
          </p>
        )}

        {(mode === "login" || mode === "register") && (
          <>
            <button className="google-auth-button" type="button" onClick={async () => {
              setError("");
              try {
                await auth.loginWithGoogle();
                navigate(from, { replace: true });
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Google sign-in failed.");
              }
            }} disabled={auth.loading}>
              <svg className="google-mark" aria-hidden="true" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
                <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
                <path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.63.39 3.17 1.04 4.55l3.35-2.62Z" />
                <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.82 1.5l2.88-2.88A9.66 9.66 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
              </svg>
              Continue with Google
            </button>
            <div className="auth-divider"><span>or</span></div>
          </>
        )}

        {mode === "login" && auth.developmentLoginAvailable && auth.loginAsDevelopmentCustomer && (
          <button className="btn-secondary" type="button" onClick={async () => {
            setError("");
            try {
              await auth.loginAsDevelopmentCustomer?.();
              navigate(from, { replace: true });
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Development login failed.");
            }
          }} disabled={auth.loading}>
            Developer test login
          </button>
        )}

        <button className="btn-primary" type="submit" disabled={auth.loading}>
          {auth.loading ? "Loading..." : copy.button}
        </button>

        <div className="auth-links">
          {mode !== "login" && <Link to="/login">Back to login</Link>}
          {mode === "login" && <Link to="/forgot-password">Forgot password?</Link>}
          {mode === "login" && <Link to="/register">Create account</Link>}
          {mode === "register" && <Link to="/verify-email">Verify email</Link>}
        </div>
      </form>
    </section>
  );
}
