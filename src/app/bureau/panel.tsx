"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, FolderOpen, RefreshCw, WifiOff, Mail } from "lucide-react";

type Status = { configured: boolean; offers: number; collecting: boolean; error: string | null; selectedSources: string[]; sources: { id: string; label: string }[]; runs: { id: string; label: string; ok: boolean; fetched: number; error: string | null; startedAt: string }[]; messages: { subject: string; text: string; at: string; to: string }[] };
type Bridge = { status(): Promise<Status>; setup(data: { name: string; email: string; password: string }): Promise<unknown>; collect(): Promise<unknown>; cancel(): Promise<unknown>; repair(): Promise<unknown>; sources(ids: string[]): Promise<unknown>; backup(): Promise<string | null>; restore(): Promise<string | null>; openData(): Promise<unknown> };
declare global { interface Window { joblyDesktop?: Bridge } }

export function DesktopPanel() {
  const [status, setStatus] = useState<Status>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [created, setCreated] = useState(false);
  const [sourceIds, setSourceIds] = useState<string[] | null>(null);
  async function refresh() { try { if (window.joblyDesktop) { setStatus(await window.joblyDesktop.status()); setError(""); } } catch { setError("Le service local ne répond plus. Fermez puis relancez Jobly. Vos données restent conservées."); } }
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 10000);
    const update = () => setOnline(navigator.onLine);
    update(); window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { clearInterval(timer); window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  async function action(fn: () => Promise<unknown>, message: string) {
    setBusy(true); setError(""); setNotice("");
    try { const result = await fn(); if (result !== null) setNotice(message); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "L’action a échoué. Réessayez."); }
    finally { setBusy(false); }
  }
  return <div className="container-page max-w-5xl py-10 sm:py-14">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div><p className="text-sm text-ink/60">Jobly sur votre ordinateur</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">{status?.configured ? "Votre espace bureau" : "Bienvenue chez vous."}</h1></div>
      {status?.configured && <Link className="btn-cobalt" href={created ? "/connexion" : "/offres"}>{created ? "Se connecter" : "Explorer les offres"}</Link>}
    </div>
    {!online && <p role="status" className="mt-6 flex items-center gap-2 rounded-xl bg-warning-soft p-4 text-warning"><WifiOff size={18} aria-hidden="true" />Hors connexion : vos données restent disponibles. L’actualisation reprendra avec Internet.</p>}
    {error && <p role="alert" className="mt-6 rounded-xl bg-danger-soft p-4 text-danger">{error}</p>}
    {notice && <p role="status" className="mt-6 rounded-xl bg-success-soft p-4 text-success">{notice}</p>}
    {!status ? <p className="py-10" role="status">Préparation de votre espace…</p> : <>
      {!status.configured && <section className="mt-8 max-w-xl"><h2 className="text-2xl font-semibold">Créez votre compte local</h2><p className="mt-2 text-ink/65">Votre profil, vos favoris et votre CV restent sur cet ordinateur. Aucun abonnement ni clé API n’est nécessaire. Ce compte permet aussi de régler les sources dans l’administration.</p>
        <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void action(async () => { await window.joblyDesktop!.setup({ name: String(data.get("name")), email: String(data.get("email")), password: String(data.get("password")) }); setCreated(true); }, "Compte créé. Connectez-vous avec vos identifiants pour retrouver vos favoris et votre profil."); }}>
          <label className="block text-sm font-medium">Votre nom<input className="input-ink mt-1 w-full" name="name" required minLength={2} autoComplete="name" /></label>
          <label className="block text-sm font-medium">Adresse email<input className="input-ink mt-1 w-full" name="email" type="email" required autoComplete="email" /></label>
          <label className="block text-sm font-medium">Mot de passe (8 caractères minimum)<input className="input-ink mt-1 w-full" name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
          <button className="btn-cobalt" disabled={busy}>{busy ? "Création…" : "Créer mon compte"}</button>
        </form></section>}
      <section className="mt-10 grid gap-6 sm:grid-cols-[1fr_auto]"><div><h2 className="text-2xl font-semibold">Des offres qui restent à jour.</h2><p className="mt-3 max-w-2xl text-ink/65">Stages et alternances tech en France. La collecte démarre à l’ouverture, puis toutes les deux heures tant que Jobly reste ouvert. Les filtres choisis dans la recherche sont conservés pendant la consultation.</p><p className="mt-3 font-mono text-sm" aria-live="polite">{status.offers.toLocaleString("fr-FR")} offres actives · {status.collecting ? "Collecte en cours…" : "Collecte disponible"}</p></div>
        <div className="flex flex-col gap-3"><button className="btn-outline self-start" disabled={busy || status.collecting || !online} onClick={() => void action(() => window.joblyDesktop!.collect(), "Collecte lancée. Les offres apparaissent progressivement ; certaines sources prennent plusieurs minutes.")}><RefreshCw size={16} aria-hidden="true" />Actualiser les offres</button>{status.collecting && <button className="btn-outline" disabled={busy} onClick={() => void action(() => window.joblyDesktop!.cancel(), "Arrêt demandé. Les résultats déjà collectés sont conservés.")}>Arrêter la collecte</button>}</div>
      </section>
      {status.error && <p role="alert" className="mt-4 text-danger">{status.error}</p>}
      <details className="mt-6 rounded-xl border border-line bg-paper p-5"><summary className="cursor-pointer font-semibold">Sources de la collecte · {status.selectedSources.length || status.sources.length} sélectionnées</summary><p className="mt-3 text-sm text-ink/65">Une sélection vide active toutes les sources du catalogue. Les filtres métier et localisation s’appliquent ensuite dans la recherche.</p><fieldset disabled={busy || status.collecting} className="mt-4 grid max-h-72 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2"><legend className="sr-only">Choisir les sources</legend>{status.sources.map((source) => <label key={source.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={(sourceIds ?? status.selectedSources).includes(source.id)} onChange={(event) => { const current = sourceIds ?? status.selectedSources; setSourceIds(event.target.checked ? [...current, source.id] : current.filter((id) => id !== source.id)); }} />{source.label}</label>)}</fieldset><div className="mt-4 flex flex-wrap gap-3"><button className="btn-outline" disabled={busy || status.collecting} onClick={() => setSourceIds([])}>Toutes les sources</button><button className="btn-cobalt" disabled={busy || status.collecting || sourceIds === null} onClick={() => void action(async () => { await window.joblyDesktop!.sources(sourceIds ?? []); setSourceIds(null); }, "Sources enregistrées pour les prochains cycles.")}>Enregistrer les sources</button></div></details>
      <section className="mt-10 border-t border-line pt-6"><h2 className="text-2xl font-semibold">Vos données, à portée de main.</h2><p className="mt-2 text-ink/65">Les sauvegardes contiennent votre compte, vos offres, vos paramètres et vos CV. Conservez-les dans un endroit privé. Une sauvegarde web compatible peut aussi être importée.</p><div className="mt-5 flex flex-wrap gap-3">
        <button disabled={busy} className="btn-outline" onClick={() => void action(() => window.joblyDesktop!.backup(), "Sauvegarde enregistrée.")}><Download size={16} aria-hidden="true" />Sauvegarder</button>
        <button disabled={busy || status.collecting} className="btn-outline" onClick={() => void action(() => window.joblyDesktop!.restore(), "Sauvegarde importée. Fermez puis relancez Jobly pour retrouver la session importée.")}>Importer une sauvegarde</button>
        <button className="btn-outline" onClick={() => void window.joblyDesktop!.openData()}><FolderOpen size={16} aria-hidden="true" />Dossier de données</button>
        <button className="btn-outline" disabled={busy} onClick={() => void action(() => window.joblyDesktop!.repair(), "Index de recherche réparé.")}>Réparer la recherche</button>
      </div></section>
      <section className="mt-10 border-t border-line pt-6"><h2 className="flex items-center gap-2 text-2xl font-semibold"><Mail size={22} aria-hidden="true" />Messages locaux</h2><p className="mt-2 text-ink/65">Les confirmations, réinitialisations et alertes sont déposées ici. Aucun email n’est envoyé à l’extérieur.</p><div className="mt-5 space-y-3">{status.messages.length === 0 ? <p className="text-sm text-ink/60">Vos prochains messages apparaîtront ici.</p> : status.messages.map((mail) => <details key={mail.at} className="rounded-xl border border-line bg-paper p-4"><summary className="cursor-pointer font-medium">{mail.subject}<span className="ml-3 text-xs font-normal text-ink/60">{new Date(mail.at).toLocaleString("fr-FR")}</span></summary><p className="mt-3 whitespace-pre-wrap break-words text-sm">{mail.text.split(/(https?:\/\/[^\s]+)/g).map((part, i) => /^https?:/.test(part) ? <a className="underline" href={part} key={i}>{part}</a> : part)}</p></details>)}</div></section>
      <section className="mt-10 border-t border-line pt-6"><h2 className="text-2xl font-semibold">Derniers passages des sources</h2><p className="mt-2 text-sm text-ink/65">La couverture dépend des sites d’origine : une source bloquée ou partielle est signalée ci-dessous.</p><ul className="mt-5 divide-y divide-line">{status.runs.length === 0 ? <li className="py-3 text-ink/60">La première collecte n’a pas encore terminé de source.</li> : status.runs.map((run) => <li key={run.id} className="py-3"><div className="flex justify-between gap-3"><strong className="font-medium">{run.label}</strong><span className={run.ok ? "text-success" : "text-warning"}>{run.fetched} offres · {run.ok ? "Terminé" : "À vérifier"}</span></div>{run.error && <p className="mt-1 break-words text-sm text-ink/60">{run.error}</p>}</li>)}</ul></section>
    </>}
  </div>;
}
