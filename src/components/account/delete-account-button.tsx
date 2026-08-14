"use client";

import { useTransition } from "react";
import { deleteAccount } from "@/server/account/actions";

/** Suppression définitive du compte — confirmation explicite requise (spec §45). */
export function DeleteAccountButton() {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (
      !window.confirm(
        "Supprimer définitivement votre compte et toutes vos données (candidatures, offres sauvegardées, CV) ? Cette action est irréversible.",
      )
    ) {
      return;
    }
    startTransition(() => deleteAccount());
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-sm font-semibold text-red-600 underline-offset-4 hover:underline disabled:opacity-50"
    >
      {pending ? "Suppression…" : "Supprimer mon compte et mes données"}
    </button>
  );
}
