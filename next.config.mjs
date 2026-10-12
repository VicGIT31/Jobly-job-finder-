/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { isServer }) {
    if (!isServer) {
      // Le score de correspondance (calculé côté client sur les cartes) importe
      // indirectement `server/ingest/dedup`, qui charge `crypto` sans l'utiliser
      // dans le chemin client. Sans ceci, webpack embarquait ~320 Ko de
      // polyfill crypto dans /offres. Un alias (et non `fallback`, que Next
      // redéfinit au niveau des règles) remplace le module par un module vide.
      config.resolve.alias = { ...config.resolve.alias, crypto: false };
    }
    return config;
  },
};

export default nextConfig;
