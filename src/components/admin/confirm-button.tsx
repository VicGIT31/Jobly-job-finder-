"use client";

/**
 * Bouton de soumission destructeur : demande une confirmation explicite avant
 * d'envoyer le formulaire. Utilisé pour les suppressions du panneau admin, qui
 * sont définitives (offre, entreprise, compte).
 */
export function ConfirmButton({
  children,
  message,
  className = "text-sm font-semibold text-red-600 underline-offset-4 hover:underline",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
