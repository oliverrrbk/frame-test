# Afsender-logo i indbakken (det gule "B") — BIMI-opskrift

**Problem:** I Gmail/Outlook vises et gult cirkel-"B" ved siden af afsenderen "Bison Frame".
Det er et **auto-genereret fallback-ikon** (første bogstav i afsendernavnet) — det
styres af mailklienten, **ikke** af mailens HTML eller af koden i dette repo. Derfor
kan det ikke fikses med en kodeændring.

For at få bison-logoet vist som afsender-ikon skal man sætte **BIMI** op. Det er en
DNS-/infrastruktur-opgave på domænet `bisonframe.dk`.

---

## Forudsætninger

- Adgang til DNS for `bisonframe.dk` (hos jeres domæne-/hosting-udbyder).
- Mails sendes i dag via **Resend** som `Bison Frame <info@bisonframe.dk>`
  (se `api/send-email.js`). SPF/DKIM skal være sat korrekt op for Resend først.

## Trin

### 1. DMARC på håndhævelse
BIMI kræver, at DMARC-policyen **ikke** er `p=none`. Sæt mindst `p=quarantine`
(helst `p=reject`) i DNS — TXT-record på `_dmarc.bisonframe.dk`:

```
_dmarc.bisonframe.dk   TXT   "v=DMARC1; p=quarantine; rua=mailto:dmarc@bisonframe.dk; adkim=s; aspf=s"
```

> ⚠️ Skift først til håndhævelse, når SPF + DKIM er verificeret for alle afsendere
> (Resend, evt. Google Workspace), ellers kan legitime mails blive afvist.

### 2. Lav logoet i SVG Tiny PS-format
BIMI kræver et **kvadratisk SVG i "Tiny Portable/Secure"-profil** (ikke alm. SVG):
- Kvadratisk viewBox (fx 0 0 512 512), centreret motiv.
- Ensfarvet baggrund (ikke transparent).
- Ingen scripts, eksterne referencer eller rasterbilleder.
- Attribut `baseProfile="tiny-ps"` og et `<title>` med firmanavnet.

Host filen på en HTTPS-URL, fx `https://bisonframe.dk/bimi-logo.svg`.

### 3. BIMI-record i DNS
TXT-record på `default._bimi.bisonframe.dk`:

```
default._bimi.bisonframe.dk   TXT   "v=BIMI1; l=https://bisonframe.dk/bimi-logo.svg; a=https://bisonframe.dk/vmc.pem"
```

### 4. VMC (Verified Mark Certificate) — krævet af Gmail
Gmail viser **kun** BIMI-logoet, hvis der peges på et gyldigt **VMC** (`a=`-feltet ovenfor).
- Købes hos fx **DigiCert** eller **Entrust**, typisk **~7.000–10.000 kr./år**.
- Kræver et **registreret varemærke** på "Bison Frame" (tal med revisor/advokat).
- (Apple Mail kan vise BIMI uden VMC, men Gmail kræver det.)

---

## Anbefalet rækkefølge / ansvar
1. **DNS-udbyder:** SPF/DKIM verificeret → DMARC til `p=quarantine`.
2. **Design:** levér SVG Tiny PS-logo, host det.
3. **Jura/økonomi:** registrér varemærke → køb VMC.
4. **DNS-udbyder:** tilføj BIMI-record med `l=` og `a=`.

Ingen af trinnene kræver ændringer i kodebasen.
