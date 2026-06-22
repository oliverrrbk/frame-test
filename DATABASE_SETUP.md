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
| `add_ai_curation_columns.sql` | AI-kuration-kolonner på `leads` |
| `add_digital_quotes.sql` | Kolonner til digitale web-tilbud |
| `supabase/add_case_number.sql` | Sekvens + `case_number` (starter ved 1000) |
| `setup_profile_fields.sql` | Profilfelter på `carpenters` |

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
| `supabase/setup_chat_notifications.sql` | Chat: `last_read_at` (ulæst) + push-trigger på nye beskeder (kør sidst, efter setup_chat) |
| `setup_error_logs.sql` | In-house fejlfinder: `error_logs`-tabel + RLS (alle må logge, kun superadmin må læse) |

### 3) RPC'er (funktioner)
| Fil | Formål |
|-----|--------|
| `add_rpc_for_quotes.sql` | Kunde henter tilbud via hemmeligt token |
| `setup_public_quotes_rpc.sql` | `quote_token` + offentlige quote-RPC'er |
| `supabase/create_accept_estimate_rpc.sql` | `accept_estimate_by_token` (offentlig accept) |
| `setup_time_entries_rpc.sql` | `mutate_time_entries` (atomisk timeregistrering) |
| `setup_calendar_events_rpc.sql` | `mutate_calendar_events` (atomisk kalender) |
| `setup_case_messages_rpc.sql` | `mutate_case_messages` (atomiske sags-beskeder) |

### 4) RLS-hærdning (efter fundament + tabeller)
| Fil | Formål |
|-----|--------|
| `setup_rls_hardening.sql` | `trg_protect_carpenter_cols` (bloker selv-eskalering) + `my_company_id()` |
| `setup_rls_carpenters_hardening.sql` | Stram læseadgang til `carpenters` |
| `setup_security_hardening_2.sql` | carpenter_secrets, bilag-bucket, tegninger |
| `setup_assigned_pm_rls_fix.sql` | Tilføj `assigned_pm` til leads SELECT/UPDATE-policy |
| `supabase/add_anonymous_update_policy.sql` | Tillad anonym kunde at acceptere via token |

### 5) Triggers & vagter (KØR SIDST — afhænger af ovenstående)
| Fil | Formål | Note |
|-----|--------|------|
| `setup_leads_field_guard.sql` | `protect_lead_sensitive_fields()` + `trg_protect_lead_fields` (beskyt pris/økonomi/status mod ikke-ejere) | **Synkroniseret med ↓** |
| `supabase/add_lead_push_trigger.sql` | **Kanonisk** version af `protect_lead_sensitive_fields()` (med anon-accept) **+** `tr_on_lead_push_notify` (push ved godkendt/forespørgsel/tildeling/besked) | **Kør EFTER field_guard** |
| `setup_payroll_lock_guard.sql` | `effective_payroll_lock()` + `enforce_payroll_lock` (server-side lønlås) | |
| `setup_leads_price_masking.sql` | `get_visible_leads()` (skjul priser for svende/lærlinge) | |

---

## Vigtige sammenhænge (ingen drift!)
- **`protect_lead_sensitive_fields()`** defineres i BÅDE `setup_leads_field_guard.sql`
  og `supabase/add_lead_push_trigger.sql`. De er **identiske** (begge tillader anonyme
  kunder at acceptere + skrive `audit_trail`). Ændrer du den ene, **skal** du ændre den
  anden. Den der køres SIDST vinder — så `add_lead_push_trigger.sql` er den kanoniske.
- **Push-notifikationer** sendes af `send-push-reminders` (edge-funktion), trigget af
  `tr_on_lead_push_notify` (DB-trigger) ved status-skift/tildeling/besked. Der findes
  ingen separat "push-on-accept"-funktion (med vilje — DB-triggeren dækker alt).
- **Edge-funktioner** (i `supabase/functions/`) deployes separat med
  `supabase functions deploy <navn>` — ikke via SQL.

## Senere: rigtige CLI-migrationer
Hvis I vil over på Supabases formelle migrations-system: lav en **baseline** af den
nuværende live-database med `supabase db dump`, læg den som første migration, og
`supabase migration repair` så eksisterende ikke gen-anvendes. Gør IKKE en simpel
`db push` mod den live database — den vil prøve at gen-anvende alt.
