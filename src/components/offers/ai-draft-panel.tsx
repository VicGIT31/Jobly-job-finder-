"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { generateApplicationAnswer } from "@/server/ai/actions";
import { AI_TONES, AI_TONE_LABELS } from "@/server/ai/tones";
import type { Tone } from "@/server/ai/provider";

const DEFAULT_QUESTION = "Pourquoi voulez-vous rejoindre cette entreprise ?";

/**
 * Générateur de brouillon de réponse de candidature (spec §19). N'affiche
 * jamais « généré par IA » quand `isRealAi` est faux (spec §56) — dans ce
 * cas le libellé annonce explicitement un gabarit à personnaliser.
 */
export function AiDraftPanel({ offerId, isLoggedIn }: { offerId: string; isLoggedIn: boolean }) {
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [tone, setTone] = useState<Tone>("professional");
  const [result, setResult] = useState<{ text: string; isRealAi: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => generateApplicationAnswer(offerId, question, tone),
    onSuccess: (res) => {
      if (res.ok) {
        setResult({ text: res.text, isRealAi: res.isRealAi });
        setError(null);
      } else {
        setError(res.error);
        setResult(null);
      }
    },
    onError: () => setError("Une erreur inattendue est survenue."),
  });

  if (!isLoggedIn) {
    return (
      <div className="panel">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <Sparkles aria-hidden="true" size={17} className="text-accent" />
          Brouillon de réponse
        </h2>
        <p className="mt-2 text-sm text-ink/60">
          <Link href="/connexion" className="link">
            Connectez-vous
          </Link>{" "}
          pour générer un brouillon de réponse personnalisé pour cette offre.
        </p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
        <Sparkles aria-hidden="true" size={17} className="text-accent" />
        Brouillon de réponse
      </h2>
      <p className="mt-1 text-xs text-ink/60">
        Basé sur votre profil (
        <Link href="/mon-espace" className="underline-offset-4 hover:underline">
          à compléter ici
        </Link>
        ) — toujours à relire et personnaliser avant envoi.
      </p>

      <div className="mt-3 space-y-2">
        <label htmlFor="ai-question" className="eyebrow block">
          Question ou consigne
        </label>
        <textarea
          id="ai-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          rows={2}
          className="input-ink text-sm"
        />

        <label htmlFor="ai-tone" className="eyebrow block">
          Ton
        </label>
        <select
          id="ai-tone"
          value={tone}
          onChange={(e) => setTone(e.target.value as Tone)}
          className="input-ink text-sm"
        >
          {AI_TONES.map((t) => (
            <option key={t} value={t}>
              {AI_TONE_LABELS[t]}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || question.trim().length === 0}
          className="btn-cobalt w-full"
        >
          {mutation.isPending ? "Génération…" : "Générer un brouillon"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-3">
          <p className="eyebrow">
            {result.isRealAi ? "Brouillon généré par IA" : "Brouillon gabarit (sans IA)"}
          </p>
          <textarea
            readOnly
            value={result.text}
            rows={8}
            className="input-ink mt-1.5 text-sm leading-relaxed"
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      )}
    </div>
  );
}
