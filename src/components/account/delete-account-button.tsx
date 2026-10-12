"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
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
      className="btn btn-sm border border-danger/40 bg-paper text-danger hover:bg-danger hover:text-white"
    >
      <Trash2 aria-hidden="true" size={14} />
      {pending ? "Suppression…" : "Supprimer mon compte et mes données"}
    </button>
  );
}
