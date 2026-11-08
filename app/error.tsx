"use client";

export default function ErrorPage({reset}:{reset:()=>void}) {
  return <main className="auth-shell"><div className="auth-layout"><section className="auth-card">
    <h2>Não foi possível carregar</h2>
    <p className="auth-subtitle" role="alert">O serviço está temporariamente indisponível. Tente novamente em instantes.</p>
    <button className="primary-btn" onClick={reset}>Tentar novamente</button>
  </section></div></main>;
}
