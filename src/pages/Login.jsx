import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { TEAL, AMBER, PANEL } from "@/lib/arcade";
import { Anchor, Loader2, LogIn, Mail, Lock } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, isAuthenticated, isLoadingAuth, firebaseReady } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isLoadingAuth && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Email o password non validi");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Login Google fallito");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b161b] px-4 text-white">
      <div className={`w-full max-w-md rounded-2xl ${TEAL} ${PANEL} p-6`}>
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-black bg-[#0b161b]">
            <Anchor className="text-[#f5a623]" size={28} />
          </div>
          <h1 className="text-2xl uppercase tracking-wide">Grand Voyage</h1>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-[#f5a623]">Accedi all'equipaggio</p>
          {!firebaseReady && (
            <p className="mt-3 rounded-lg border border-[#f5a623]/40 bg-[#0b161b] px-3 py-2 text-[10px] uppercase text-[#f5a623]">
              Firebase non configurato. Compila `.env.local` e riavvia il server.
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border-2 border-red-500/50 bg-red-950/50 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {firebaseReady && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogle}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-black bg-[#0b161b] py-3 text-xs uppercase tracking-wide shadow-[0_3px_0_0_#000] disabled:opacity-50"
            >
              Continua con Google
            </button>
            <div className="relative mb-4 text-center text-[10px] uppercase text-white/40">
              <span className="relative z-10 bg-[#164446] px-2">oppure email</span>
              <div className="absolute inset-x-0 top-1/2 h-px bg-black" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-[10px] uppercase tracking-widest text-[#f5a623]">Email</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#f5a623]" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!firebaseReady}
              className="w-full rounded-xl border-2 border-black bg-[#0b161b] py-2.5 pl-9 pr-3 text-sm text-white disabled:opacity-40"
            />
          </div>
          <label className="block text-[10px] uppercase tracking-widest text-[#f5a623]">Password</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#f5a623]" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!firebaseReady}
              className="w-full rounded-xl border-2 border-black bg-[#0b161b] py-2.5 pl-9 pr-3 text-sm text-white disabled:opacity-40"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !firebaseReady}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm uppercase tracking-wide ${AMBER} border-2 border-black shadow-[0_3px_0_0_#000] disabled:opacity-40`}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <LogIn size={16} />}
            Accedi
          </button>
        </form>

        {firebaseReady && (
          <p className="mt-4 text-center text-[10px] uppercase text-white/50">
            Non hai un account?{" "}
            <Link to="/register" className="text-[#f5a623] underline">
              Registrati
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
