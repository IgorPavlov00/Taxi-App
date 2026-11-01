# 🚕 Taxi App

[![Angular](https://img.shields.io/badge/Angular-DD0031?style=flat&logo=angular&logoColor=white)](https://angular.io/)
[![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=flat&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Render](https://img.shields.io/badge/Render-46E3B7?style=flat&logo=render&logoColor=black)](https://render.com/)

A taxi booking simulator built with Angular and Leaflet. Search real addresses, see the fare for the actual road route, then follow your taxi along it on the map. No real cars or payments are involved.

## Features

- **Address search and map pins**: suggestions as you type, or tap the map to choose a spot
- **Road routing**: distance, time and fare come from the real route, at 400 RSD per km
- **Live ride simulation**: the taxi follows the route with progress and time remaining; trips play back in 12 to 45 seconds
- **Ride history**: totals, ride details and pagination, stored in the browser's local storage
- **Responsive and accessible**: works on phones, supports keyboard use and respects reduced-motion settings

The app never asks for card details. Choosing Cash or Card only labels the ride, and card data saved by older versions is erased the next time the history loads.

## Getting started

You need Node.js 18 (see `.nvmrc`).

```bash
git clone https://github.com/IgorPavlov00/Taxi-App.git
cd Taxi-App
npm ci
npm start
```

Then open http://localhost:4200.

| Command | What it does |
| --- | --- |
| `npm start` | Runs the development server |
| `npm run build` | Creates a production build in `dist/untitled1` |
| `npm test` | Runs the unit tests |

## Deploying to Render

`render.yaml` defines a static site, including the rewrite that lets routes like `/map` load directly.

1. In Render, choose **New > Blueprint** and connect this repository.
2. Select the branch to deploy and apply the Blueprint.

Render then builds and redeploys on every push to that branch.

## Map services

The app calls these free public services directly from the browser, with no API keys:

| Purpose | Service |
| --- | --- |
| Map tiles | [OpenStreetMap](https://www.openstreetmap.org/copyright) |
| Address search | [Photon](https://photon.komoot.io) |
| Routing | [OSRM demo server](https://project-osrm.org) |

They are fine for a demo, but they have usage limits and no uptime guarantee. An app with real traffic should move to a paid or self-hosted provider.
