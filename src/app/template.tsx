/**
 * Transition d'entrée entre les pages : remonté à chaque navigation, ce
 * gabarit rejoue un fondu court (CSS pur, aucun JS, coupé si mouvement réduit).
 * Les changements de filtres de /offres (même segment) ne le déclenchent pas.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-fade">{children}</div>;
}
