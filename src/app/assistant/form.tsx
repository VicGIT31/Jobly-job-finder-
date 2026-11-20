"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Cpu, GitBranch, LoaderCircle, Monitor, Sparkles } from "lucide-react";
import type { AssistantProvider, AssistantSettings, RemoteAssistant, SubscriptionStatus } from "@/lib/collection-assistant";

const SOURCES = {
  chatgpt: { name: "ChatGPT", description: "Modèles de votre abonnement · édition personnelle", icon: Sparkles },
  copilot: { name: "GitHub Copilot", description: "Claude, Gemini, Grok et autres modèles selon votre abonnement", icon: GitBranch },
  ollama: { name: "Ollama sur cet ordinateur", description: "Mistral et autres modèles téléchargés, sans abonnement", icon: Monitor },
} as const;

export function AssistantForm({ initial, profile, welcome, providers }: {
  initial: AssistantSettings; profile: { firstName: string; lastName: string };
  welcome: boolean; providers: RemoteAssistant[];
}) {
  const router = useRouter();
  const stepTitle = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(welcome ? 1 : 2);
  const [firstName, setFirst] = useState(profile.firstName);
  const [lastName, setLast] = useState(profile.lastName);
  const [provider, setProvider] = useState<AssistantProvider>(initial.provider);
  const [model, setModel] = useState(initial.model);
  const [dailyCalls, setDailyCalls] = useState(initial.dailyCalls);
  const [accounts, setAccounts] = useState<Partial<Record<RemoteAssistant, SubscriptionStatus>>>({});
  const account = provider === "local" ? undefined : accounts[provider];
  const [loadingModels, setLoadingModels] = useState(false);
  const [busy, setBusy] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function updateAccount(source: RemoteAssistant, value: SubscriptionStatus) {
    setAccounts((current) => ({ ...current, [source]: value }));
    setModel((current) => value.models.some(({ slug }) => slug === current) ? current : value.models[0]?.slug ?? "");
  }

  useEffect(() => {
    if (step !== 2 || provider === "local") return;
    const source = provider;
    let active = true;
    setLoadingModels(true);
    window.joblyDesktop?.subscriptionStatus(source)
      .then((value) => { if (active) updateAccount(source, value); })
      .catch(() => { if (active) setError("Les modèles ne répondent pas. Réessayez."); })
      .finally(() => { if (active) setLoadingModels(false); });
    return () => { active = false; };
  }, [step, provider]);

  async function connect() {
    if (provider === "local") return;
    setError("");
    setConnecting(true);
    try {
      const value = await window.joblyDesktop?.subscriptionConnect(provider);
      if (value) updateAccount(provider, value);
    } catch {
      setError(`La connexion ${SOURCES[provider].name} n’a pas abouti. Réessayez ou choisissez un autre mode.`);
    } finally { setConnecting(false); }
  }

  async function disconnect() {
    try {
      const value = await window.joblyDesktop?.subscriptionDisconnect("chatgpt");
      if (value) { updateAccount("chatgpt", value); setProvider("local"); }
    } catch { setError("La déconnexion n’a pas abouti."); }
  }

  function choose(source: AssistantProvider) {
    setProvider(source);
    setError("");
    setMessage("");
    setModel(source === "local" ? "" : source === initial.provider ? initial.model : accounts[source]?.models[0]?.slug ?? "");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const response = await fetch("/api/collection-assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(step === 1
          ? { stage: "profile", firstName, lastName }
          : { provider, model: provider === "local" ? "" : model, dailyCalls, welcome }),
      });
      const body = await response.json();
      if (!response.ok) { setError(body.error ?? "Impossible d’enregistrer."); return; }
      if (step === 1) {
        setStep(2);
        requestAnimationFrame(() => stepTitle.current?.focus());
      } else if (welcome) {
        void window.joblyDesktop?.collect().catch(() => undefined);
        router.replace("/offres");
        router.refresh();
      } else setMessage("Votre choix est enregistré.");
    } catch { setError("Jobly n’a pas pu enregistrer ce choix. Réessayez."); }
    finally { setBusy(false); }
  }

  return (
    <div className="onboard-panel">
      {welcome && <p className="mb-5 text-sm font-semibold text-accent">Étape {step} sur 2</p>}
      <h1 className="text-3xl font-semibold sm:text-4xl" tabIndex={-1} ref={stepTitle}>
        {step === 1 ? "Bonjour, bienvenue sur Jobly." : "Choisissez votre modèle d’IA"}
      </h1>
      <p className="mt-3 max-w-lg text-ink/70">
        {step === 1 ? "Votre profil local réunit vos favoris, vos recherches et vos candidatures."
          : <>{welcome && firstName && <>Bienvenue, {firstName}. </>}L’IA aide à classer les annonces ambiguës. Jobly collecte les offres avec ou sans assistant.</>}
      </p>
      <form onSubmit={submit} className="mt-7">
        {step === 1 ? <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold">Prénom
            <input className="input-ink" autoComplete="given-name" maxLength={60} required value={firstName} onChange={(event) => setFirst(event.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">Nom
            <input className="input-ink" autoComplete="family-name" maxLength={60} required value={lastName} onChange={(event) => setLast(event.target.value)} />
          </label>
        </div> : <>
          <fieldset disabled={busy || connecting} className="grid gap-3">
            <legend className="sr-only">Abonnement et modèle</legend>
            {providers.map((source) => {
              const { name, description, icon: Icon } = SOURCES[source];
              return <label className="assistant-choice" key={source}>
                <Icon size={22} aria-hidden="true" className="shrink-0" />
                <span><strong className="block">{name}</strong><span className="text-sm text-ink/70">{description}</span></span>
                <input type="radio" className="ml-auto h-5 w-5 shrink-0 accent-accent" name="provider" checked={provider === source} onChange={() => choose(source)} />
              </label>;
            })}
            <label className="assistant-choice">
              <Cpu size={22} aria-hidden="true" className="shrink-0" />
              <span><strong className="block">Continuer sans IA</strong><span className="text-sm text-ink/70">Classement à partir du titre et du secteur</span></span>
              <input type="radio" className="ml-auto h-5 w-5 shrink-0 accent-accent" name="provider" checked={provider === "local"} onChange={() => choose("local")} />
            </label>
          </fieldset>
          {provider !== "local" && <div className="mt-5 grid gap-4" aria-busy={loadingModels}>
            {loadingModels && <p className="text-sm text-ink/75" role="status">Recherche des modèles disponibles…</p>}
            {!loadingModels && account?.message && <p className="text-sm text-ink/75" role="status">{account.message}</p>}
            {!loadingModels && (!account?.connected || !account.models.length) && <>
              {provider !== "ollama" && <p className="text-sm text-ink/75">Autorisez votre abonnement dans le navigateur. Seuls de courts extraits des annonces seront transmis.</p>}
              <button type="button" className="btn-outline justify-self-start" onClick={() => void connect()} disabled={connecting}>
                {connecting ? <><LoaderCircle size={16} aria-hidden="true" className="animate-spin" /> {provider === "ollama" ? "Actualisation…" : "Connexion dans votre navigateur…"}</> :
                  provider === "ollama" ? "Actualiser les modèles" : provider === "copilot" ? "Continuer avec GitHub" : "Continuer avec ChatGPT"}
              </button>
            </>}
            {!loadingModels && !!account?.models.length && <>
              <label className="grid gap-1.5 text-sm font-semibold">Modèle disponible
                <select className="input-ink w-full min-w-0" value={model} onChange={(event) => setModel(event.target.value)}>
                  {account.models.map(({ slug, displayName }) => <option key={slug} value={slug}>{displayName}</option>)}
                </select>
              </label>
              <label className="grid max-w-xs gap-1.5 text-sm font-semibold">Nombre maximum de lots par jour
                <input className="input-ink" type="number" min={1} max={30} required value={Number.isNaN(dailyCalls) ? "" : dailyCalls} onChange={(event) => setDailyCalls(event.target.valueAsNumber)} />
              </label>
              {provider === "chatgpt" && <div className="flex flex-wrap items-center gap-4 text-sm">
                <a className="link" href="https://chatgpt.com/settings/usage" target="_blank" rel="noreferrer">Gérer l’usage ChatGPT</a>
                <button type="button" className="btn-ghost" onClick={() => void disconnect()}>Déconnecter ChatGPT</button>
              </div>}
              {provider === "ollama" && <button type="button" className="btn-ghost justify-self-start" onClick={() => void connect()} disabled={connecting}>Actualiser les modèles</button>}
            </>}
          </div>}
        </>}
        {error && <p className="mt-4 text-danger" role="alert">{error}</p>}
        {message && <p className="mt-4 text-success" role="status">{message}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          {step === 2 && welcome && <button type="button" className="btn-ghost" onClick={() => { setStep(1); setError(""); }}>Retour</button>}
          <button type="submit" className="btn-cobalt" disabled={busy || connecting || (step === 2 && provider !== "local" && (loadingModels || !account?.connected || !model))}>
            {busy ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
            {step === 1 ? "Continuer" : welcome ? "Découvrir les offres" : "Enregistrer le choix"}
          </button>
        </div>
      </form>
    </div>
  );
}
