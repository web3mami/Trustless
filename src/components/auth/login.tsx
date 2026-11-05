"use client";

import { useState } from "react";
import { useLoginWithEmail, useLoginWithOAuth } from "@privy-io/react-auth";
import { DayScene } from "@/components/auth/day-scene";
import { hasPrivyApp } from "@/components/providers";

export function Login({ ready = true }: { ready?: boolean }) {
  const configured = hasPrivyApp();

  return (
    <main className="login">
      <DayScene />
      <div className="login-card">
        <p className="kicker">The village</p>
        <h1 className="display">Trustless</h1>
        <p className="login-lede">Choose how to sign in.</p>
        {configured ? (
          <LoginMethods ready={ready} />
        ) : (
          <p className="login-setup">
            Add <code>NEXT_PUBLIC_PRIVY_APP_ID</code> from the Privy dashboard,
            then enable Google, X, and email. A wallet is created on first
            sign-in.
          </p>
        )}
        <p className="login-foot">New to the village? Use any method above.</p>
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
        Sign in with Google
      </button>
      <button
        className="login-btn login-x"
        type="button"
        disabled={!ready || busy}
        onClick={() => social("twitter")}
      >
        Sign in with X
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
            {sent ? "Enter the village" : "Send code"}
          </button>
        </form>
      ) : (
        <button
          className="login-btn login-mail"
          type="button"
          disabled={!ready || busy}
          onClick={() => setEmailOpen(true)}
        >
          Sign in with email
        </button>
      )}
      {error ? <p className="login-error">{error}</p> : null}
    </div>
  );
}

