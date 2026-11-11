/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  /** Cle Google Maps Embed API (optionnelle) : sans elle, le bouton "Google Maps" de la carte GPS reste indisponible. */
  readonly VITE_GOOGLE_MAPS_EMBED_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
