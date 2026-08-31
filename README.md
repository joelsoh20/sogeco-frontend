# SOGECO Fleet Manager — Frontend

Interface web de la plateforme de gestion de flotte.

## Pile

React 18 · TypeScript · Vite · TailwindCSS · TanStack Query · Zustand
React Router · React Hook Form · Recharts · Leaflet · STOMP over SockJS

## Demarrage

```bash
npm install
npm run dev
```

L'application ecoute sur `http://localhost:5173`.

**Le backend doit tourner sur le port 8080.** Le proxy Vite relaie
`/api` et `/ws` : aucune configuration CORS n'est necessaire en
developpement, et cela reproduit la configuration de production ou
Nginx sert le front et relaie l'API.

## Connexion de demonstration

| Identifiant | Mot de passe |
|---|---|
| `admin@sogeco.cm` | celui defini apres le premier changement |

## Structure

```
src/
├── api/          client axios, interceptors, endpoints
├── components/
│   ├── layout/   Sidebar, Topbar, AppLayout, ProtectedRoute
│   └── ui/       StatCard, StatusBadge, EmptyState, Spinner
├── hooks/        useStompSubscription
├── lib/          formatage FCFA, km, litres, dates
├── pages/        un fichier par ecran
├── store/        etat d'authentification (Zustand)
└── types/        types miroir des DTO backend
```

## Conventions

1. **Les permissions pilotent la navigation.** Une entree de menu dont
   l'utilisateur n'a pas les droits n'est pas grisee : elle n'existe
   pas pour lui. Le backend refuse de toute facon les appels.
2. **Aucune valeur inventee.** Un indicateur non encore calcule par le
   backend est absent, jamais simule.
3. **Chiffres tabulaires** sur toutes les colonnes numeriques : sans
   cela les montants dansent d'une ligne a l'autre.
4. **FCFA sans decimales** : le franc CFA n'a pas de subdivision en
   circulation.
5. **Ecrans vides orientes action** : on dit quoi faire, pas qu'il n'y
   a rien.

## Renouvellement des jetons

Le jeton d'acces dure 15 minutes. L'intercepteur axios le renouvelle
automatiquement sur 401 et rejoue la requete. Les appels concurrents
sont mis en file pendant le renouvellement : sans cela, dix requetes
simultanees declencheraient dix renouvellements et invalideraient la
session par rotation.

## Temps reel

Le hook `useStompSubscription` s'abonne aux canaux de diffusion :

| Canal | Contenu |
|---|---|
| `/topic/vehicle-positions` | Positions du parc |
| `/topic/alerts` | Nouvelles alertes |
| `/topic/alerts/critical` | Alertes critiques |

Le jeton passe dans l'en-tete STOMP `CONNECT`, jamais dans l'URL.

## Ecrans livres

| Ecran | Etat |
|---|---|
| Connexion | Livre |
| Changement de mot de passe | Livre |
| Tableau de bord | Livre |
| Carte GPS | Livre |
| Camions | Livre |
| Missions | Livre |
| Carburant | Livre |
| Alertes | Livre |
| Maintenance | Livre |
| Chauffeurs | Livre |
| Parametres | Livre |
| Assurance & Visite | Ecran d'attente — backend au sprint 6 |
| Rapports | Ecran d'attente — backend au sprint 7 |

Les deux derniers ecrans annoncent leur contenu a venir plutot que
d'afficher des donnees fictives : en revue de sprint, un ecran honnete
sur son avancement vaut mieux qu'une maquette animee.
