import { useLocation, Link } from "react-router-dom";

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b161b] p-6 text-white">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-7xl font-light text-white/20">404</h1>
        <div className="mx-auto h-0.5 w-16 bg-[#f5a623]/40" />
        <h2 className="text-2xl uppercase tracking-wide">Pagina non trovata</h2>
        <p className="text-white/60 leading-relaxed">
          La pagina <span className="text-[#f5a623]">"{pageName}"</span> non esiste.
        </p>
        <Link
          to="/"
          className="inline-flex items-center rounded-xl border-2 border-black bg-[#164446] px-4 py-2 text-sm uppercase tracking-wide shadow-[0_3px_0_0_#000] hover:-translate-y-0.5"
        >
          Torna alla Storia
        </Link>
      </div>
    </div>
  );
}
