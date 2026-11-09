"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type AuthFormProps = { mode: "login" | "register" };

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isRegister = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, password }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? (isRegister ? "Registration failed." : "Login failed."));
      router.replace("/");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link className="flex items-center space-x-2.5 mb-6" href="/" aria-label="Meridian home">
          <span className="font-extrabold text-xl tracking-tight text-white">Meridian</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">Platform</span>
        </Link>
        <span className="eyebrow">YOUR GEOSPATIAL WORKSPACE</span>
        <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-intro">{isRegister ? "Create an account to manage spatial intelligence and fleet telemetry." : "Sign in to continue to Meridian."}</p>
        <form className="auth-form" onSubmit={submit}>
          {isRegister && <label>Display name<input autoComplete="name" maxLength={80} required value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>}
          <label>Email address<input type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input type="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 12 : undefined} required value={password} onChange={(event) => setPassword(event.target.value)} />{isRegister && <small>At least 12 characters; maximum 72 UTF-8 bytes.</small>}</label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Please wait…" : isRegister ? "Create account" : "Sign in"}</button>
        </form>
        <p className="auth-switch">{isRegister ? "Already have an account?" : "New to Meridian?"} <Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create an account"}</Link></p>
        <Link className="auth-back" href="/">← Back to Overview</Link>
      </section>
    </main>
  );
}
