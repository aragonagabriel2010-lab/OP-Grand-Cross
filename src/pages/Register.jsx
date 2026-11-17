import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { TEAL, AMBER, PANEL } from "@/lib/arcade";
import { Anchor, Loader2, UserPlus, Mail, Lock, User } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const { register, isAuthenticated, isLoadingAuth, firebaseReady } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isLoadingAuth && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!firebaseReady) {
    return <Navigate to="/login" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim() || undefined);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Registrazione fallita");
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
          <h1 className="text-2xl uppercase tracking-wide">Crea account</h1>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-[#f5a623]">Unisciti alla ciurma</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border-2 border-red-500/50 bg-red-950/50 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-[10px] uppercase tracking-widest text-[#f5a623]">Nome</label>
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#f5a623]" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border-2 border-black bg-[#0b161b] py-2.5 pl-9 pr-3 text-sm text-white"
              maxLength={24}
            />
          </div>
          <label className="block text-[10px] uppercase tracking-widest text-[#f5a623]">Email</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#f5a623]" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border-2 border-black bg-[#0b161b] py-2.5 pl-9 pr-3 text-sm text-white"
            />
          </div>
          <label className="block text-[10px] uppercase tracking-widest text-[#f5a623]">Password</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#f5a623]" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border-2 border-black bg-[#0b161b] py-2.5 pl-9 pr-3 text-sm text-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm uppercase tracking-wide ${AMBER} border-2 border-black shadow-[0_3px_0_0_#000] disabled:opacity-50`}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
            Registrati
          </button>
        </form>

        <p className="mt-4 text-center text-[10px] uppercase text-white/50">
          Hai già un account?{" "}
          <Link to="/login" className="text-[#f5a623] underline">
            Accedi
          </Link>
        </p>
      </div>
    </div>
  );
}
