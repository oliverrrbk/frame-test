# Database-opsætning — kanonisk oversigt

Dette er **den eneste sandhed** for Bison Frames database (Supabase/Postgres):
alle SQL-scripts, deres formål, den korrekte køre-rækkefølge, og hvilke filer der
afløser/supplerer hinanden.

## ⚠️ Gyldne regler
1. **Den nuværende live-database har allerede alt herunder kørt.** Kør IKKE scripts
   "for en sikkerheds skyld" — de fleste er idempotente, men nogle (RLS-hærdning,
   triggers) skal køres i rækkefølge for at ende korrekt.
2. **Rækkefølgen herunder gælder kun et FRISK miljø** (ny Supabase-instans).
3. Når du tilføjer en ny DB-ændring: læg scriptet ind, og **tilføj det her** i den
   rigtige gruppe — så driver vi aldrig fra hinanden igen.

---

## Køre-rækkefølge (frisk miljø)

### 1) Fundament — tabeller & kolonner
| Fil | Formål |
|-----|--------|
| `setup_rls.sql` | Basis: kolonner på `leads`/`carpenters` + grund-RLS. **Kør FØRST.** |
| `fix_carpenters_raw_data.sql` | Tilføjer `raw_data`-kolonne til `carpenters` |
| `update_carpenters.sql` | Ekstra kolonner på `carpenters` |
| `add_columns.sql` | Diverse kolonne-tilføjelser på `leads` |
| `add_integration_columns.sql` | Integrations-id-kolonner (ordrestyring/apacta/minuba) |
| `add_minuba_secret.sql` | Minuba-nøgle-kolonne |
| `add_smtp_settings.sql` | `smtp_settings` (JSONB) på `carpenter_secrets` — egen SMTP-mailopsætning |
| `add_ai_curation_columns.sql` | AI-kuration-kolonner på `leads` |
| `add_digital_quotes.sql` | Kolonner til digitale web-tilbud |
| `supabase/add_case_number.sql` | Sekvens + `case_number` (starter ved 1000) |
| `setup_profile_fields.sql` | Profilfelter på `carpenters` |
| `setup_business_type.sql` | `business_type` på `carpenters` (default `'tomrer'`). Branche valgt ved oprettelse. KUN `'tomrer'` har prisberegner/materialer/Wizard — alle andre fag (inkl. entreprenør) laver kun Hurtigt tilbud. Gating sker i klienten (`src/utils/features.js`); låste beregner-filer røres ikke. |

### 2) Tabeller & features
| Fil | Formål |
|-----|--------|
| `setup_avatars.sql` | Storage-bucket + politikker til profilbilleder |
| `setup_drawings.sql` / `add_drawings_table.sql` | Tegninger/skitser-tabel |
| `setup_subcontractors.sql` | Underleverandører (uden login) |
| `setup_subcontractors_workers.sql` | `workers`-array på underleverandører |
| `setup_payroll.sql` | `payroll_settings` (lønperiode + lås) |
| `setup_push_subscriptions.sql` | `push_subscriptions` + `sent_push_notifications` |
| `setup_stripe_events.sql` | Idempotens-tabel til Stripe-webhook |
| `setup_calibration.sql` | Kalibrerings-data (beregner) |
| `setup_public_carpenter.sql` | Offentlig læseadgang til tømrer-profil (wizard) |
| `supabase/setup_chat.sql` | Frame Chat-system: tabeller, indexes + RLS til sikker real-time chat |
| `supabase/fix_chat_rls.sql` | Rettelse af chat-RLS-politikker |
| `supabase/fix_chat_rls_case_private.sql` | **Gør sagschat (case) privat** — kun deltagere kan se den; kun `company`-chat er firma-bred. Kør EFTER `fix_chat_rls.sql` (overskriver dens case-led) |
| `supabase/setup_chat_notifications.sql` | Chat: `last_read_at` (ulæst) + push-trigger på nye beskeder (kør sidst, efter setup_chat) |
| `supabase/setup_chat_edit_delete_hide.sql` | Chat: `edited_at`/`deleted_at` på beskeder (rediger/fortryd) + `hidden_at` på `chat_participants` (skjul samtale pr. bruger) + UPDATE-RLS for egen besked/deltager-række + `REPLICA IDENTITY FULL`. Kør EFTER `setup_chat.sql` |
| `setup_error_logs.sql` | In-house fejlfinder: `error_logs`-tabel + RLS (alle må logge, kun superadmin må læse) |
| `setup_quote_dataset.sql` | **Tilbuds-datasæt (datavold til fremtidig AI-tilbudsmotor).** `quote_dataset`-tabel (én række pr. sag: tilbud + udfald: accepteret/faktureret/faktiske timer) + superadmin-RLS + **fejl-sikker trigger på `leads`** (`capture_quote_dataset`) der snapshotter ved tilbud/status/udfald. Triggeren kan ALDRIG vælte et lead-skriv. **Jura:** at TRÆNE/SÆLGE på tværs af kunder kræver licens-klausul i vilkårene først. |
| `setup_quote_templates.sql` | **Tilbuds-skabeloner** til feltet "Arbejdsbeskrivelse" i Hurtigt tilbud. `quote_templates`-tabel (rich-text `body_html`) gemt pr. FIRMA (`carpenter_id` = firma-roden = `company_id \|\| egen id`) + RLS så hele teamet deler skabelonerne. Bruges af `src/utils/quoteTemplates.js` + `QuickQuoteBuilder.jsx`. |
| `supabase/setup_customers.sql` | **Kunde-bibliotek.** Ny tabel `customers` (ét kundekort pr. FIRMA, `carpenter_id` = firma-rod som leads: navn/mail/telefon/adresse/zip/by/type/cvr/notes + `updated_at`-trigger) + ny kolonne `leads.customer_id` (nullable FK → customers) så tilbud/sager kobles til kunden + firma-afgrænset RLS (SELECT/INSERT/UPDATE/DELETE, samme mønster som leads) + **backfill** (opret kunder ud fra eksisterende leads, dedup pr. firma på navn+telefon/mail, og kobl gamle leads til dem). Idempotent. Bruges af Kunder-fanen (`CaseManagement.jsx`) + kundevælger i `QuickQuoteBuilder.jsx`. |

### 3) RPC'er (funktioner)
| Fil | Formål |
|-----|--------|
| `add_rpc_for_quotes.sql` | Kunde henter tilbud via hemmeligt token |
| `setup_public_quotes_rpc.sql` | `quote_token` + offentlige quote-RPC'er |
| `setup_agreement_confirm_rpc.sql` | `confirm_agreement_by_token` — kunde bekræfter én aftaleseddel via mail-link (offentlig side `/:slug/aftale/:token/:agreementId`). Kræver `get_lead_by_token` fra `setup_public_quotes_rpc.sql`. |
| `supabase/create_accept_estimate_rpc.sql` | `accept_estimate_by_token` (offentlig accept) |
| `setup_time_entries_rpc.sql` | `mutate_time_entries` (atomisk timeregistrering) |
| `setup_calendar_events_rpc.sql` | `mutate_calendar_events` (atomisk kalender) |
| `setup_case_messages_rpc.sql` | `mutate_case_messages` (atomiske sags-beskeder) |
| `setup_lead_raw_data_rpc.sql` | `mutate_lead_raw_data(p_id, p_patch)` — atomisk shallow-merge af `leads.raw_data` (kun ændrede top-level-nøgler skrives, så samtidige skrivninger ikke overskriver hinandens andre felter). SECURITY INVOKER → RLS + feltspærre gælder. Bruges af `CaseManagement` (materialer/checklister/sagsdata). |
| `supabase/soft_delete_lead.sql` | `soft_delete_lead(p_lead_id)` — pålidelig soft-delete af tilbud/kladder (autoriserer ejer/opretter/sales; nægter bekræftede sager for ikke-ejere). **Opdaterer også `protect_lead_sensitive_fields()`** med en `app.allow_delete`-undtagelse → **kør EFTER `add_lead_push_trigger.sql`** så den kanoniske trigger-version vinder |
| `supabase/add_quote_revocation.sql` | **Tilbagekald af afsendte tilbud (link-invalidering).** Ny kolonne `leads.revoked_at` + **opdaterer `soft_delete_lead()`** (sætter `revoked_at` når et allerede AFSENDT/åbnet/bekræftet tilbud slettes — interne kladder påvirkes ikke) + **opdaterer `update_lead_by_token()`** (nægter bekræftelse hvis `revoked_at`/`status='Slettet'`). Mailen kan ikke kaldes tilbage, men kundens link bliver dødt. Den offentlige `QuoteAcceptPage` viser "trukket tilbage". **Kør EFTER `supabase/soft_delete_lead.sql` OG `supabase/fix_public_quote_confirm.sql`** (overskriver begge funktioner med samme krop + spærren). |

### 4) RLS-hærdning (efter fundament + tabeller)
| Fil | Formål |
|-----|--------|
| `setup_rls_hardening.sql` | `trg_protect_carpenter_cols` (bloker selv-eskalering) + `my_company_id()` |
| `setup_rls_carpenters_hardening.sql` | Stram læseadgang til `carpenters` |
| `setup_security_hardening_2.sql` | carpenter_secrets, bilag-bucket, tegninger |
| `setup_assigned_pm_rls_fix.sql` | Tilføj `assigned_pm` til leads SELECT/UPDATE-policy |
| `supabase/widen_leads_access_confirmed.sql` | **Udvid leads SELECT/UPDATE: alle i firmaet kan se/føre timer på BEKRÆFTEDE sager** (selvbetjent — ingen manuel tildeling). Kør EFTER `setup_assigned_pm_rls_fix.sql` (overskriver dens SELECT/UPDATE-policy). Skrivning er fortsat hærdet af `protect_lead_sensitive_fields()` |
| `supabase/add_anonymous_update_policy.sql` | Tillad anonym kunde at acceptere via token |
| `setup_guest_access.sql` | **Gæste-/projekt-medlemmer (Ghost → Guest).** Ny tabel `project_members` (kobler en person til ÉT lead; `auth_user_id` NULL=ghost, udfyldt=guest) + `is_project_member()`-helper. **Udvider leads SELECT/UPDATE** med "ELLER aktivt projekt-medlem" og **udvider `get_visible_leads()`** så `guest` får økonomi + intern chat maskeret OG kun ser sine EGNE timer (ikke andres). **Kør EFTER `widen_leads_access_confirmed.sql` OG `setup_leads_price_masking.sql`** — den overskriver begge og bliver den nye kanoniske version af leads-policyerne + `get_visible_leads()`. Ændrer du leads-policy eller masken, skal denne fil følges ad. |

### 5) Triggers & vagter (KØR SIDST — afhænger af ovenstående)
| Fil | Formål | Note |
|-----|--------|------|
| `setup_leads_field_guard.sql` | `protect_lead_sensitive_fields()` + `trg_protect_lead_fields` (beskyt pris/økonomi/status mod ikke-ejere) | **Synkroniseret med ↓** |
| `supabase/add_lead_push_trigger.sql` | **Kanonisk** version af `protect_lead_sensitive_fields()` (med anon-accept) **+** `tr_on_lead_push_notify` (push ved godkendt/forespørgsel/tildeling/besked) | **Kør EFTER field_guard** |
| `setup_payroll_lock_guard.sql` | `effective_payroll_lock()` + `enforce_payroll_lock` (server-side lønlås) | |
| `setup_leads_price_masking.sql` | `get_visible_leads()` (skjul priser for svende/lærlinge) | |

### 6) Indeks (ydelse — kan køres når som helst)
| Fil | Formål |
|-----|--------|
| `setup_leads_indexes.sql` | Indeks på `leads(carpenter_id, created_at)`, `assigned_to`, `status` + GIN på `raw_data->assigned_workers/assigned_pm/invoice_history`. Fjerner fuld tabel-scan i RLS-filtre + dashboard-fetch. Additiv, idempotent. |

---

## Vigtige sammenhænge (ingen drift!)
- **`protect_lead_sensitive_fields()`** defineres i BÅDE `setup_leads_field_guard.sql`
  og `supabase/add_lead_push_trigger.sql`. De er **identiske** (begge tillader anonyme
  kunder at acceptere + skrive `audit_trail`). Ændrer du den ene, **skal** du ændre den
  anden. Den der køres SIDST vinder — så `add_lead_push_trigger.sql` er den kanoniske.
- **Kunde-bekræftelse af tilbud** sker via RPC'en `update_lead_by_token` (i
  `add_rpc_for_quotes.sql`). Den kører `SET row_security = off` og sætter
  `app.confirm_via_token`, som `protect_lead_sensitive_fields()` stoler på — så
  'Sendt tilbud' → 'Bekræftet opgave' virker for ALLE tømrere, uanset hvem der er
  logget ind. Hele rettelsen ligger samlet i `supabase/fix_public_quote_confirm.sql`
  (kør den i SQL Editor). Ændrer du token-flowet, skal RPC + begge trigger-kopier følges ad.
- **Push-notifikationer** sendes af `send-push-reminders` (edge-funktion), trigget af
  `tr_on_lead_push_notify` (DB-trigger) ved status-skift/tildeling/besked. Der findes
  ingen separat "push-on-accept"-funktion (med vilje — DB-triggeren dækker alt).
- **"Dagen efter"-påmindelse om kalender-planlægning**: `send-push-reminders` har en
  `unplanned_case`-blok (kører via det daglige cron-kald kl. 08) der finder sager med
  status `Bekræftet opgave` UDEN `raw_data.start_date`, hvor `raw_data.confirmed_at`
  (sat ved bekræftelse) ligger på en tidligere dag — og pinger mester + admins. Kræver
  KUN `supabase functions deploy send-push-reminders` (ingen SQL/cron-ændring).
- **Edge-funktioner** (i `supabase/functions/`) deployes separat med
  `supabase functions deploy <navn>` — ikke via SQL.

## Senere: rigtige CLI-migrationer
Hvis I vil over på Supabases formelle migrations-system: lav en **baseline** af den
nuværende live-database med `supabase db dump`, læg den som første migration, og
`supabase migration repair` så eksisterende ikke gen-anvendes. Gør IKKE en simpel
`db push` mod den live database — den vil prøve at gen-anvende alt.
