# Vulcano — Fucina di Agenti AI (PWA offline)

Una **PWA mobile-first** che fa girare modelli LLM **interamente nel browser** tramite
[WebLLM](https://github.com/mlc-ai/web-llm) (WebGPU). Nessuna chiamata API, nessuna
chiave, nessun server: i pesi del modello si scaricano una volta e restano in cache
per l'uso **offline**.

L'obiettivo è una *fucina* di agenti personalizzabili in base al contesto e all'uso,
pensata come **base per una futura app Android**.

## Cosa fa

- **Modelli locali, lista dinamica.** Il menu dei modelli è popolato a runtime da
  `webllm.prebuiltAppConfig.model_list`, quindi gli ID sono sempre validi per la
  versione caricata. Di default mostra solo i modelli leggeri (`low_resource_required`),
  adatti al mobile (0.5B–2B); una spunta mostra tutti.
- **Agenti personalizzabili.** 6 agenti predefiniti per contesto/uso (assistente,
  programmatore, traduttore, riassuntore, brainstorming, tutor) + agenti **custom**
  con system prompt salvati in `localStorage` (restano sul dispositivo).
- **Chat con memoria di conversazione** e reset.
- **Offline reale**: service worker (`sw.js`) che precacha l'app shell e la libreria
  dal CDN; i pesi del modello sono gestiti dalla Cache API interna di WebLLM.
- **Installabile**: `manifest.json` + icone PNG (192/512).

## Requisiti

- Browser con **WebGPU** attivo (Chrome/Edge desktop e Android recenti; iOS 18+ con
  WebGPU abilitato). Senza WebGPU la generazione non parte.
- Prima esecuzione **online** per scaricare libreria e modello; poi funziona offline.

## Avvio locale

Serve via HTTP (il service worker non funziona da `file://`):

```bash
cd mobile/pwa-shell
python3 -m http.server 8080
# apri http://localhost:8080/
```

Su Chrome Android: *Menu → Installa app* per aggiungerla alla home come app standalone.

## Icone

Le icone PNG sono generate senza dipendenze (solo `zlib` di Node):

```bash
node tools/generate-icons.js
```

## Percorso verso l'app Android

La PWA è già la base di un'app Android tramite **TWA (Trusted Web Activity)**:

1. Pubblica questa cartella su HTTPS (es. GitHub Pages).
2. Usa [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) per generare il
   progetto Android dal `manifest.json` (`bubblewrap init --manifest <url>/manifest.json`).
3. Build dell'APK/AAB e pubblicazione.

Tutta l'inferenza resta on-device: l'app Android è un guscio sulla stessa PWA WebLLM.

## File

| File | Ruolo |
| --- | --- |
| `index.html` | UI della fucina (modelli + agenti + chat) |
| `sw.js` | Service worker per l'offline |
| `public/manifest.json` | Manifest PWA (installabilità) |
| `public/icons/` | Icone 192/512 |
| `tools/generate-icons.js` | Generatore icone PNG (Node, zero dipendenze) |
