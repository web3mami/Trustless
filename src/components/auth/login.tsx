"use client";

import { useState } from "react";
import { useLoginWithEmail, useLoginWithOAuth } from "@privy-io/react-auth";
import { DayScene } from "@/components/auth/day-scene";
import { hasPrivyApp } from "@/components/providers";
import { useTheme } from "@/lib/theme";

export function Login({ ready = true }: { ready?: boolean }) {
  const configured = hasPrivyApp();
  const { resolvedTheme, setTheme } = useTheme();
  const night = resolvedTheme === "moonlit";

  return (
    <main className="login">
      <DayScene />
      <button
        className="login-theme-toggle"
        type="button"
        aria-label={night ? "Switch to Village Day" : "Switch to Moonlit Night"}
        title={night ? "Village Day" : "Moonlit Night"}
        onClick={() => setTheme(night ? "day" : "moonlit")}
      >
        {night ? <SunIcon /> : <MoonIcon />}
      </button>
      <div className="login-card">
        <p className="kicker login-kicker">The Network</p>
        <h1 className="display login-title">Trustless</h1>
        <p className="login-lede">Verify your identity to enter.</p>
        {configured ? (
          <LoginMethods ready={ready} />
        ) : (
          <p className="login-setup">
            Add <code>NEXT_PUBLIC_PRIVY_APP_ID</code> from the Privy dashboard,
            then enable Google, X, and email.
          </p>
        )}
        <div className="login-foot">
          <p>New here? Your account will be created automatically.</p>
          <p className="login-foot-secondary">
            Your on-chain identity is created securely with your account.
          </p>
        </div>
      </div>
    </main>
  );
}

function LoginMethods({ ready }: { ready: boolean }) {
  const { initOAuth } = useLoginWithOAuth();
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function social(provider: "google" | "twitter") {
    setError("");
    setBusy(true);
    try {
      await initOAuth({ provider });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in did not finish.");
      setBusy(false);
    }
  }

  async function send() {
    setError("");
    setBusy(true);
    try {
      await sendCode({ email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code.");
    }
    setBusy(false);
  }

  async function confirm() {
    setError("");
    setBusy(true);
    try {
      await loginWithCode({ code: code.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code did not work.");
      setBusy(false);
    }
  }

  return (
    <div className="login-methods">
      <button
        className="login-btn login-google"
        type="button"
        disabled={!ready || busy}
        onClick={() => social("google")}
      >
        <GoogleIcon />
        <span>Sign in with Google</span>
      </button>
      <button
        className="login-btn login-x"
        type="button"
        disabled={!ready || busy}
        onClick={() => social("twitter")}
      >
        <XIcon />
        <span>Sign in with X</span>
      </button>
      {emailOpen ? (
        <form
          className="login-email"
          onSubmit={(event) => {
            event.preventDefault();
            if (sent) void confirm();
            else void send();
          }}
        >
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@village.mail"
            disabled={sent}
          />
          {sent ? (
            <>
              <label htmlFor="login-code">Code</label>
              <input
                id="login-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Six-digit code"
              />
            </>
          ) : null}
          <button className="login-btn login-mail" type="submit" disabled={busy || !email.trim()}>
            <MailIcon />
            <span>{sent ? "Enter the network" : "Send code"}</span>
          </button>
        </form>
      ) : (
        <button
          className="login-btn login-mail"
          type="button"
          disabled={!ready || busy}
          onClick={() => setEmailOpen(true)}
        >
          <MailIcon />
          <span>Sign in with email</span>
        </button>
      )}
      {error ? <p className="login-error">{error}</p> : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="login-provider-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285f4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
      <path fill="#34a853" d="M12 22c2.7 0 4.98-.9 6.63-2.42l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#fbbc05" d="M6.39 13.87A6 6 0 0 1 6.08 12c0-.65.11-1.28.31-1.87V7.51H3.04A10 10 0 0 0 2 12c0 1.61.38 3.13 1.04 4.49l3.35-2.62Z" />
      <path fill="#ea4335" d="M12 6c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.62C7.18 7.76 9.39 6 12 6Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="login-provider-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.39L6.48 22H3.36l7.27-8.31L2.98 2h6.4l4.42 5.84L18.9 2Zm-1.1 17.84h1.73L8.44 4.05H6.58L17.8 19.84Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="login-provider-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6.5h16v11H4z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="m4.8 7.3 7.2 5.4 7.2-5.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2.6v2.1m0 14.6v2.1M2.6 12h2.1m14.6 0h2.1M5.35 5.35l1.48 1.48m10.34 10.34 1.48 1.48m0-13.3-1.48 1.48M6.83 17.17l-1.48 1.48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M18.7 15.5A7.6 7.6 0 0 1 8.5 5.3 7.7 7.7 0 1 0 18.7 15.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

