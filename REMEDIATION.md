# Sikkerhedshærdning — udrulningsguide (juli 2026)

Denne fil beskriver hvad der er rettet, hvad **du selv** skal gøre (SQL + secrets +
deploy), og hvordan du verificerer bagefter. Kode-rettelserne ruller ud automatisk
ved push til `main` (frontend via Vercel, edge-funktioner via GitHub Action) — men
**database-migrationen og miljøvariablerne skal du sætte manuelt.**

---

## ✅ DEL 1 — Det DU skal gøre (kun dig kan gøre dette)

### 1. Kør database-migrationen på prod
Åbn Supabase → SQL Editor og kør **`setup_security_hardening_3.sql`** (hele filen —
den er idempotent). Kør FØRST de tre tjek fra bunden af auditten for at bekræfte
tilstanden. Vær særligt opmærksom på **blok 10** (DROP COLUMN på gamle `*_api_key`):
kør kun `DROP COLUMN`-linjerne når du er tryg — ellers kør kun `UPDATE ... = NULL`
først. Alle blokke har rollback-noter.

Migrationen lukker: privilege-escalation på `carpenters` (INSERT+UPDATE), manglende
RLS på `materials`/`settings`/`profiles`, cross-tenant lead-tampering + `quote_token`-
kapring, cross-tenant chat-injektion, offentlig carpenter-RPC-læk, avatars-bucket-
overskrivning, kalender-sletning, og de gamle API-nøgle-kolonner.

### 2. Sæt miljøvariabler
**Vercel** (Project → Settings → Environment Variables):
- `CRM_WEBHOOK_TOKEN` — det NYE CRM-token (se punkt 3). Bruges af `api/crm-signup.js` + `api/convert-guest.js`.
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (eller `KV_REST_API_URL`/`KV_REST_API_TOKEN`) — **valgfrit men anbefalet**: uden dem er rate-limiting en no-op (send-email, process-voice, crm-signup, ai-support beskyttes så ikke mod spam/omkostnings-misbrug).

**Supabase** (Edge Functions → Secrets):
- `ACCOUNTING_WEBHOOK_SECRET` — sæt en stærk tilfældig værdi. **Vigtigt:** `accounting-webhooks` afviser nu ALT hvis den ikke er sat (fail-closed). Tilføj derefter `?secret=<værdi>` på webhook-URL'en hos **Dinero OG e-conomic** — ellers stopper "faktura betalt"-automatikken.

### 3. Rotér kompromitterede secrets
- **CRM-tokenet `bf_sec_8f92a4c10e39b7d6a5f4c3e2d1`** lå hardkodet i browser-bundlen og skal betragtes som lækket. Lav et nyt token i `bisoncrm.dk`, sæt det som `CRM_WEBHOOK_TOKEN`, og **spær det gamle**. (Det gamle token ligger stadig i den nuværende `dist/`-build indtil frontend genbygges.)
- **OpenAI- og Anthropic-nøglerne** i `.env` bør roteres med jævne mellemrum (de rammer ikke browseren, men lever i klartekst lokalt).

### 4. Lås Google Maps-nøglen
`VITE_GOOGLE_MAPS_API_KEY` ligger (uundgåeligt) i browser-bundlen. Gå i Google Cloud
Console → Credentials og sæt **HTTP-referrer-begrænsning** (kun `bisonframe.dk` +
`*.bisonframe.dk` + evt. localhost) og **API-begrænsning** (kun de Maps-API'er I bruger)
+ et kvote-loft. Ellers kan andre bruge jeres kvote.

### 5. Opdatér sårbare pakker
```
npm audit fix
```
Retter react-router HIGH-advisories (og dompurify moderate via jspdf). Genkør
`npm audit` og bekræft 0 HIGH/CRITICAL.

### 6. Deploy
- **Frontend:** push til `main` → Vercel bygger og udruller (fjerner det gamle CRM-token fra bundlen + slår sikkerhedsheaders til).
- **Edge-funktioner:** GitHub Action deployer de ændrede funktioner ved push til `main` (kræver `SUPABASE_ACCESS_TOKEN`-secret). Alternativt: `supabase functions deploy accounting-webhooks apacta-case dinero-voucher economic-voucher invite-employee minuba-case ordrestyring-case send-push-reminders`.

---

## 🔒 DEL 2 — Hvad jeg rettede i koden (ruller ud ved push)

| Fil | Fix |
|-----|-----|
| `vercel.json` | Sikkerhedsheaders: CSP, HSTS, X-Frame-Options DENY (clickjacking), nosniff, Referrer-Policy, Permissions-Policy |
| `api/send-email.js` | Kræver JWT/quote_token; anonyme sends bindes til en registreret tømrer (ikke frit relay); rate-limit; TLS-validering slået til; generisk fejl |
| `api/process-voice.js` | Kræver gyldig JWT + rate-limit (lukkede den åbne OpenAI-proxy) |
| `src/supabaseClient.js` + 4 kaldesteder | Ny `authHeaders()`-helper; voice-kald sender nu access token |
| `api/crm-signup.js` (ny) + `Register.jsx` + `api/convert-guest.js` | CRM-token flyttet server-side (env), fjernet fra browser-bundlen |
| `DrawingsGallery.jsx` + `CaseDrawingsTab.jsx` | SVG-thumbnails vises via `<img>` data-URI → stored-XSS umuligt |
| `supabase/functions/invite-employee` | Nægter at genbruge/nulstille en e-mail der hører til et andet firma (kontoovertagelse) |
| `supabase/functions/accounting-webhooks` | Delt hemmelighed nu OBLIGATORISK (fail-closed) + saniteret faktura-id (filter-injektion) |
| `supabase/functions/send-push-reminders` | Håndhæver service-role-nøgle (ikke længere kun advarsel) |
| `supabase/functions/{minuba,apacta,ordrestyring}-case` | `companyGuard` → firma udledes server-side (IDOR lukket); ordrestyring returnerer ikke længere sagsliste/debug-data |
| `supabase/functions/{economic,dinero}-voucher` | `filePath` valideres mod kalderens eget firma før download fra `bilag` |
| `api/test-smtp.js` | TLS-validering slået til |
| slettet: `api/check-env.js`, `api/test_calc.js` | Lækkede service-nøgle-metadata / stray test |

Database-siden (i `setup_security_hardening_3.sql`): 10 blokke — se DEL 1, punkt 1.

---

## 🧪 DEL 3 — Verificér efter udrulning
Kør igennem disse flows og bekræft at de virker (rettelserne rører dem):
1. **Offentlig wizard:** indsend en forespørgsel → tømrer + kunde får mail; nyt lead vises hos tømreren.
2. **Tilbudsaccept:** åbn et tilbudslink som kunde → accepter → status skifter, bekræftelsesmail sendes.
3. **Stemme-diktering** (log/hurtigt tilbud/projekt) som indlogget → transskribering virker (401 hvis udlogget = korrekt).
4. **Send tilbud** som indlogget tømrer (egen SMTP + Resend-fallback).
5. **Invitér medarbejder** (ny e-mail virker; en e-mail fra et andet firma afvises pænt).
6. **Skift avatar/logo** + se tegnings-thumbnails.
7. **Beregner** (offentlig) henter stadig tømrerens priser/materialer.
8. **CSP:** åbn konsollen på `bisonframe.dk` efter deploy og tjek for CSP-blokerede ressourcer. Sker det, udvid den relevante `*-src` i `vercel.json` (test gerne i en Vercel preview-deploy først).

---

## 📋 DEL 4 — Kendte rest-punkter (kræver produkt-beslutning senere)
- **`materials`/`settings` er stadig anon-læsbare** (den låste `Wizard.jsx` læser dem direkte via anon-nøglen). Writes er låst til eget firma. For at lukke læse-eksponeringen skal wizardens materialehentning flyttes til en `SECURITY DEFINER`-RPC — kræver at `Wizard.jsx` må ændres.
- **`send-email` anonymt relay er indsnævret, ikke helt lukket:** anonyme sends kræver nu at en registreret tømrer indgår (to/replyTo). Fuld lukning kræver at wizarden sender en lead-token med, så modtageren kan valideres — kræver `Wizard.jsx`-ændring, eller at wizard-mails flyttes server-side.
- **Storage-buckets `drawings` + `chat_media` er `public=true`** → filer er læsbare med URL'en. Gør dem private + brug signed URLs (kræver frontend-ændringer flere steder). `bilag` er allerede privat.
- **`profiles`:** migrationen håndterer både view (security_invoker) og tabel (RLS). Bekræft i prod hvilken det er, og at Frame Chat/tegnings-galleri stadig viser holdkammeraters navne.
- **Source maps / CSP-stramning:** overvej at self-hoste Tailwind + fonts, så `script-src`/`style-src` kan droppe `'unsafe-inline'`/`'unsafe-eval'`.

---

## ⚠️ Rækkefølge & noter
- `setup_security_hardening_3.sql` køres EFTER alle eksisterende scripts (se `DATABASE_SETUP.md`). Den er tilføjet til oversigten der.
- Edge-funktions-ændringer og frontend-ændringer bør deployes SAMMEN med at du sætter env-variablerne — ellers kan fx `accounting-webhooks` (fail-closed) eller CRM-webhooken midlertidigt stoppe indtil secrets er sat.
