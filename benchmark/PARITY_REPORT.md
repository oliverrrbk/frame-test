# Parity Report: Calculator vs AI Chat Estimator

Date: 2026-05-19T12:04:27.107Z

Compares the deterministic calculator (PATH A — `src/utils/calculator.js`) against the AI chat estimator (PATH B — `api/chat-estimator.js`) for one representative spec per category.

Verdict thresholds: PARITY (max |delta| <= 10%), DRIFT (<= 30%), MAJOR (> 30%) — based on the larger of laborHours-delta and materialCost-delta.

## Summary table

| Category | Calc hours | Calc mat (kr) | Calc final (inkl moms) | claude/claude-sonnet-4-5 h | claude/claude-sonnet-4-5 mat | claude/claude-sonnet-4-5 dH% | claude/claude-sonnet-4-5 dM% | claude/claude-sonnet-4-5 verdict | openai/gpt-5.5 h | openai/gpt-5.5 mat | openai/gpt-5.5 dH% | openai/gpt-5.5 dM% | openai/gpt-5.5 verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| vinduer | 17 | 33058 | 61.250 kr. inkl. moms | 29 | 27550 | 71% | -17% | MAJOR | 30 | 25905 | 76% | -22% | MAJOR |
| dore | 11 | 5400 | 22.500 kr. inkl. moms | 18 | 4070 | 64% | -25% | MAJOR | 22 | 4070 | 100% | -25% | MAJOR |
| gulv | 63 | 43244 | 115.000 kr. inkl. moms | 37 | 28050 | -41% | -35% | MAJOR | 42.3 | 29535 | -33% | -32% | MAJOR |
| terrasse | 45 | 14145 | 58.750 kr. inkl. moms | 58 | 12900 | 29% | -9% | DRIFT | 67.6 | 12925 | 50% | -9% | MAJOR |
| tag | 571 | 120130 | 596.250 kr. inkl. moms | 417 | 80080 | -27% | -33% | MAJOR | 415 | 66825 | -27% | -44% | MAJOR |
| koekken | 36 | 0 | 33.750 kr. inkl. moms | 55 | 11550 | 53% | Infinity% | MAJOR | 61.8 | 0 | 72% | 0% | MAJOR |
| lofter | 28 | 7188 | 36.250 kr. inkl. moms | ERR | ERR | — | — | ERR | 48.1 | 8113 | 72% | 13% | MAJOR |
| facade | 126 | 57670 | 180.000 kr. inkl. moms | 173 | 65380 | 37% | 13% | MAJOR | 172.9 | 65380 | 37% | 13% | MAJOR |
| anneks | 112 | 78660 | 195.000 kr. inkl. moms | 103 | 72000 | -8% | -8% | PARITY | 126.1 | 69960 | 13% | -11% | DRIFT |
| carport | 40 | 22770 | 65.000 kr. inkl. moms | 61 | 19800 | 53% | -13% | MAJOR | 61.1 | 19800 | 53% | -13% | MAJOR |
| hegn | 24 | 20873 | 51.250 kr. inkl. moms | 39 | 18150 | 63% | -13% | MAJOR | 40.3 | 18150 | 68% | -13% | MAJOR |

## Per-category detail

### vinduer — Vinduer: 3 stk træ/alu standardstørrelse, helårsbolig, eksisterende fjernes

**Spec (calculator input):** `{"housingType":"Helårsbolig","material":"Træ/alu (kombination)","floors":"Stueplan (Jordniveau)","disposal":"Ja, tømreren skal afmontere OG bortskaffe dem","pcbCheck":"Nej, bygget/skiftet efter 1977","twoTone":"Nej, samme farve ude og inde","amount":3,"finish":"Ja"}`

**PATH A (Calculator):** hours=17, materialCost=33058 kr, finalPriceIncVat=61250 kr (61.250 kr. inkl. moms)

Calculator breakdown:
- Basis montering: 3 facadevinduer vurderet til ca. 10.5 arbejdstimer
- Materialer afregnet inkl. tillæg: 15% avance
- Tillæg: 3-lags energiruder (Krav: Helårsbolig / BR18) lagt til materialeprisen (+20%)
- Miljøtillæg: Bortskaffelse af mindre volumen på trailer (+ 1.5 arbejdstimer incl. sortering) - Uden avance
- Standard tillæg: Montagematerialer (skruer, kiler og fuge)
- Tid og materiale inkluderet til indvendig finish (fuger og lister/gerigter)
- Kørsel & Logistik (Hovedgaden 1 ➜ Kundens adresse): 25.0 km hver vej.
- Slitage-takst (bil) samt lukkede timer under transport (Estimeret 2 dag(e)) udregnet til i alt: 1480 kr

**PATH B — claude/claude-sonnet-4-5:**
- hours=29, materialCost=27550 kr
- delta vs calc: hours 70.6%, materials -16.7% — **MAJOR**
- breakdown:
  - 3 stk vinduer i træ/alu kombination (ca 1,2x1,2m): 10.5t / 22500 kr
  - Afmontering og bortskaffelse af gamle vinduer: 1.5t / 0 kr
  - Indvendig finish (gerigter og fuge): 4.5t / 600 kr
  - Montagematerialer, stillads og udstyr: 0t / 1950 kr
  - Opstart, opmåling, oprydning og uforudsete tillæg: 12.5t / 2500 kr
- reasoning (truncated):  OPGAVE: 3 vinduer i træ/alu kombination, standard størrelse ca 1,2x1,2m, stueplan, helårsbolig. Nuværende vinduer fra 2000 skal afmonteres og bortskaffes. Samme farve ude/inde. Indvendig finish inkluderes. MATERIALEUDREGNING: - 3 vinduer træ/alu kombination: 3 × 7.500 kr = 22.500 kr - Montagematerialer (udvendig fuge/skruer/kiler): 3 × 150 kr = 450 kr - Indvendig finish (gerigter/fuge) proxy: 3 × 200 kr = 600 kr - Leje af rullestillads (lille opgave, stueplan): 1.500 kr Subtotal materialer: 22.500 + 450 + 600 + 1.500 = 25.050 kr + 10% spild/ekstra: 25.050 × 1.10 = 27.555 kr (afrundet til 27.550 kr) TIMEUDREGNING: Fase 1 - Opstart/besigtigelse/opmåling: 3 timer Fase 2 - Afmontering af 3 gamle vinduer: 3 × 0.5t = 1.5 timer Fase 3 - Montering af 3 nye vinduer: 3 × 3.5t = 10.5 timer Fase 4 - 
**PATH B — openai/gpt-5.5:**
- hours=30, materialCost=25905 kr
- delta vs calc: hours 76.5%, materials -21.6% — **MAJOR**
- breakdown:
  - Udskiftning af 3 træ/alu vinduer i stueplan inkl. afmontering/bortskaffelse af eksisterende vinduer, montering, udvendig tætning samt indvendig finish med fuge og gerigter: 30t / 25905 kr
- reasoning (truncated): Materialer: 3 stk træ/alu vinduer á 7.500 kr = 22.500 kr. Montagematerialer 3 á 150 kr = 450 kr. Indvendig finish-materialer 3 á 200 kr = 600 kr. Nettomaterialer 23.550 kr. SOP spild/materialetillæg +10% = 25.905 kr. Ingen stillads/lift pga. stueplan og standardstørrelse. Timer: montering 3 stk á 3,5 t = 10,5 t. Afmontering/bortskaffelse 3 á 0,5 t = 1,5 t. Indvendig finish 3 á 1,5 t = 4,5 t. Opstart/besigtigelse/opmåling 3 t. Oprydning/slutfinish 3,5 t. Subtotal 23,0 t. Tillæg 30% til uforudsete forhold = 29,9 t, afrundet til 30 t.

### dore — Døre: 2 indvendige standarddøre, eksisterende fjernes, finish ja

**Spec (calculator input):** `{"disposal":"Ja, tømreren skal afmontere OG bortskaffe den/dem","doorType":"Indvendige døre","thresholds":"Nej","hardware":"Tømreren skal levere standard greb/låse","amount":2,"material":"Standard indvendig dør","doorMeasurementType":"Nej, det er standard døre","finish":"Ja"}`

**PATH A (Calculator):** hours=11, materialCost=5400 kr, finalPriceIncVat=22500 kr (22.500 kr. inkl. moms)

Calculator breakdown:
- Basis montering: 2 indvendige døre vurderet til ca. 6.0 arbejdstimer
- Materialer afregnet inkl. tillæg: 15% avance
- Miljøtillæg: Bortskaffelse af mindre volumen på trailer (+ 1.0 arbejdstimer incl. sortering) - Uden avance
- Tillæg: Montering og levering af dørgreb / låse
- Standard tillæg: Montagematerialer (skruer, kiler og fuge)
- Tid og materiale inkluderet til indvendig finish (fuger og lister/gerigter)
- Kørsel & Logistik (Hovedgaden 1 ➜ Kundens adresse): 25.0 km hver vej.
- Slitage-takst (bil) samt lukkede timer under transport (Estimeret 2 dag(e)) udregnet til i alt: 1480 kr

**PATH B — claude/claude-sonnet-4-5:**
- hours=18, materialCost=4070 kr
- delta vs calc: hours 63.6%, materials -24.6% — **MAJOR**
- breakdown:
  - Afmontering og bortskaffelse af 2 gamle døre: 1t / 0 kr
  - 2 stk standard indvendige døre inkl. montering: 6t / 2400 kr
  - Dørgreb og beslag til 2 døre: 0.6t / 700 kr
  - Gerigter og indvendig finish til 2 døre: 3t / 600 kr
  - Montagematerialer (skruer, fuge, spild 10%): 0t / 370 kr
  - Opstart, opmåling og slutfinish: 7.4t / 0 kr
- reasoning (truncated):  Opgave: 2 stk standard indvendige døre med afmontering, bortskaffelse, dørgreb og indvendig finish (gerigter). MATERIALER: - 2 stk standard indvendige døre: 2 × 1.200 kr = 2.400 kr - 2 stk dørgreb inkl. roset: 2 × 350 kr = 700 kr - 2 sæt gerigter: 2 × 300 kr = 600 kr Subtotal materialer: 3.700 kr + 10% spild og montagematerialer (skruer, fuge, etc.): 370 kr Total materialer: 4.070 kr TIMER: - Afmontering/bortskaffelse per dør: 0.5 timer × 2 = 1 time - Montering per dør: 3 timer × 2 = 6 timer - Dørgreb per dør: 0.3 timer × 2 = 0.6 timer - Indvendig finish (gerigter) per dør: 1.5 timer × 2 = 3 timer - Opstart og opmåling: 2 timer - Oprydning og finish: 1 time Subtotal: 13.6 timer × 1.30 (tillæg for uforudsete): 17.68 timer Afrundet: 18 timer BREAKDOWN: 1. Afmontering og bortskaffelse: 1 tim
**PATH B — openai/gpt-5.5:**
- hours=22, materialCost=4070 kr
- delta vs calc: hours 100.0%, materials -24.6% — **MAJOR**
- breakdown:
  - Udskiftning af 2 standard indvendige døre inkl. afmontering, bortskaffelse, nye standardgreb/lås og indvendig finish med gerigter: 22t / 4070 kr
- reasoning (truncated): DOORS: 2 indvendige standarddøre. Materialer: 2 x standard indvendig dør á 1.200 = 2.400 kr. 2 x standard dørgreb/lås á 350 = 700 kr. 2 x gerigter á 300 = 600 kr. Nettomaterialer 3.700 kr. SOP spild/montage +10% = 4.070 kr. Timer: montering 2 x 3 t = 6 t. Afmontering/bortskaffelse 2 x 0,5 t = 1 t. Hardware 2 x 0,3 t = 0,6 t. Finish/gerigter 2 x 1,5 t = 3 t. Opstart/opmåling 3 t. Oprydning/slutfinish 3 t. Subtotal 16,6 t. Uforudsete 30% = 21,58 t afrundet til 22 t.

### gulv — Gulv: 30 m² parket på strøer, gammel laminat bortskaffes, fodlister ja

**Spec (calculator input):** `{"amount":30,"disposal":"Ja, tømreren skal afmontere OG bortskaffe det","oldFloorType":"Trægulv / Parket / Laminat","floorFoundation":"Strøer / Trækonstruktion","underfloorHeating":"Nej","material":"Parket","specificFloorWishes":"Nej, tømreren skal komme med en faglig vurdering","floorPattern":"Nej, helt standard montering","skirting":"Ja"}`

**PATH A (Calculator):** hours=63, materialCost=43244 kr, finalPriceIncVat=115000 kr (115.000 kr. inkl. moms)

Calculator breakdown:
- Basis montering vurderet til ca. 12.0 arbejdstimer
- Materialer afregnet inkl. tillæg: 15% avance
- Miljøtillæg: Bortskaffelse af stort volumen (1x Containerleje/afhentning + 6.0 arbejdstimer) - Uden avance
- Tillæg: 7% materialespild (afskær) medregnet til gulvbrædderne
- Tillæg: Nedbrydning af eksisterende trægulv/parket/laminat
- Miljøtillæg: Containerleje og affaldsgebyrer for bortskaffelse af eksisterende gulv (Uden avance)
- Standard: Opretning af undergulv (inkl. tid og materialer)
- Standard: Montering af trinlydsdæmpende underlag (foam/pap)
- Tillæg: Opbygning af bærende undergulv (fx spånplader) på strøer forud for svømmende/mønster gulv
- Tillæg: Levering og montering af nye fodlister
- Kørsel & Logistik (Hovedgaden 1 ➜ Kundens adresse): 25.0 km hver vej.
- Slitage-takst (bil) samt lukkede timer under transport (Estimeret 5 dag(e)) udregnet til i alt: 3700 kr

**PATH B — claude/claude-sonnet-4-5:**
- hours=37, materialCost=28050 kr
- delta vs calc: hours -41.3%, materials -35.1% — **MAJOR**
- breakdown:
  - Nedrivning og bortskaffelse af eksisterende laminatgulv: 7.8t / 1500 kr
  - Lægning af parketgulv (30 m2): 15.6t / 22500 kr
  - Montering af fodlister: 5.85t / 1500 kr
  - Opstart, opmåling og oprydning: 7.8t / 2550 kr
- reasoning (truncated):  OPGAVE: Nyt parketgulv i stue, 30 m2. Eksisterende laminatgulv skal afmonteres og bortskaffes. Gulvet ligger på strøer/trækonstruktion. Ingen gulvvarme. Standard montering uden specialmønster. Nye fodlister skal monteres. MATERIALEBEREGNING: 1. Parketgulv: 30 m2 × 750 kr/m2 = 22.500 kr 2. Bortskaffelse af laminat: 30 m2 × 50 kr/m2 = 1.500 kr 3. Fodlister (proxy pr m2): 30 m2 × 50 kr/m2 = 1.500 kr Nettomaterialer subtotal: 22.500 + 1.500 + 1.500 = 25.500 kr + 10% spild og montagematerialer (SOP #2): 25.500 × 1.10 = 28.050 kr TOTAL MATERIALER: 28.050 kr TIMEBEREGNING: 1. Opstart, besigtigelse og opmåling: 3 timer 2. Nedrivning/bortskaffelse af eksisterende laminat: 30 m2 × 0.2 t/m2 = 6 timer 3. Lægning af parketgulv: 30 m2 × 0.4 t/m2 = 12 timer 4. Montering af fodlister: 30 m2 × 0.15 t/m2 =
**PATH B — openai/gpt-5.5:**
- hours=42.3, materialCost=29535 kr
- delta vs calc: hours -32.9%, materials -31.7% — **MAJOR**
- breakdown:
  - Afmontering og bortskaffelse af eksisterende laminatgulv, 30 m²: 7.8t / 1650 kr
  - Levering og montering af parketgulv på eksisterende trækonstruktion inkl. trinlydsunderlag, 30 m²: 23.4t / 26235 kr
  - Levering og montering af nye fodlister samt oprydning/slutfinish: 11.1t / 1650 kr
- reasoning (truncated): FLOOR. Areal 30 m². Materialer: parket 30*750=22.500 kr, trinlydsunderlag 30*45=1.350 kr, bortskaffelse let gulv 30*50=1.500 kr, fodlister proxy 30*50=1.500 kr. Nettomaterialer 26.850 kr. SOP spild/montagematerialer +10% = 29.535 kr. Timer: lægning 30*0,4=12 t, underlag 30*0,1=3 t, bortskaffelse 30*0,2=6 t, fodlister 30*0,15=4,5 t, opstart/opmåling 3 t, oprydning/slutfinish 4 t. Subtotal 32,5 t. SOP uforudset tillæg 30%: 32,5*1,30=42,25 afrundet til 42,3 t. Fordelt på breakdown-linjer med 30% tillæg indregnet.

### terrasse — Terrasse: 25 m² trykimprægneret på jord, ingen nedrivning, ingen rækværk

**Spec (calculator input):** `{"amount":25,"elevation":"Jordniveau (Almindelig træterrasse på jorden)","disposal":"Nej","material":"Trykimprægneret","fastening":"Synlige skruer (Standard montering skruet fra toppen)","railing":"Nej, ikke relevant / klarer det selv","terraceComplexity":"Nej, primært standard firkantet (eller ikke relevant)","roofing":"Nej"}`

**PATH A (Calculator):** hours=45, materialCost=14145 kr, finalPriceIncVat=58750 kr (58.750 kr. inkl. moms)

Calculator breakdown:
- Basis montering vurderet til ca. 25.0 arbejdstimer
- Materialer afregnet inkl. tillæg: 15% avance
- Standard tillæg: Forventet materialespild (+10%) samt montagematerialer (A4-skruer, beslag og kiler)
- Standard tillæg: Etablering af bærende underlag (Udgravning, dug, stabilisering og opklodsning/punktfundament)
- Kørsel & Logistik (Hovedgaden 1 ➜ Kundens adresse): 25.0 km hver vej.
- Slitage-takst (bil) samt lukkede timer under transport (Estimeret 3 dag(e)) udregnet til i alt: 2220 kr

**PATH B — claude/claude-sonnet-4-5:**
- hours=58, materialCost=12900 kr
- delta vs calc: hours 28.9%, materials -8.8% — **DRIFT**
- breakdown:
  - Fundament og forberedelse (punktfundamenter, understøtning): 15.5t / 4500 kr
  - Montering af terrasse inkl. understruktur og brædder: 38.5t / 7250 kr
  - Opstart, opmåling og oprydning: 4t / 1150 kr
- reasoning (truncated):  Okay, jeg har nu alle nødvendige oplysninger: - 25 m² terrasse - Trykimprægneret træ - På jordniveau, ingen eksisterende terrasse at fjerne - Standard montering med synlige skruer - Ingen rækværk - Ingen overdækning - Standard firkantet terrasse BEREGNING AF TIMER: 1. Opstart og opmåling: 3 timer 2. Fundament (punktfundamenter og understøtning): 25 m² × 0.5 t/m² = 12.5 timer 3. Montering af terrasse: 25 m² × 1.0 t/m² = 25 timer 4. Oprydning og finish: 4 timer Subtotal: 44.5 timer Tillæg 30% til uforudsete: 44.5 × 1.30 = 57.85 timer Afrundet: 58 timer BEREGNING AF MATERIALER: 1. Trykimprægneret terrassebrædder og understruktur: 25 m² × 220 kr/m² = 5.500 kr 2. Montagematerialer (skruer, beslag, kiler, murpap): 25 m² × 70 kr/m² = 1.750 kr 3. Punktfundament og støbemix: 25 m² × 180 kr/m² = 4.
**PATH B — openai/gpt-5.5:**
- hours=67.6, materialCost=12925 kr
- delta vs calc: hours 50.2%, materials -8.6% — **MAJOR**
- breakdown:
  - Ny træterrasse på terræn, 25 m², trykimprægneret træ, standard synlig skruemontering: 67.6t / 12925 kr
- reasoning (truncated): TERRACE. Oplyst: 25 m², trykimprægneret, på jord/jordniveau, ingen eksisterende terrasse, standard synlige skruer, ingen rækværk, ingen overdækning, standard firkantet form uden trapper/special. Materialer: trykimprægneret 220 kr/m² x 25 = 5.500 kr. Punktfundament/støbemix 180 kr/m² x 25 = 4.500 kr. Montagematerialer 70 kr/m² x 25 = 1.750 kr. Nettomaterialer = 11.750 kr. SOP +10% spild/montagetillæg = 12.925 kr. Timer: terrassemontage 1,0 t/m² x 25 = 25 t. Fundament på terræn/underkonstruktion 0,8 t/m² x 25 = 20 t. Opstart/besigtigelse/opmåling 3 t. Oprydning/slutfinish 4 t. Subtotal = 52 t. SOP +30% uforudsete = 67,6 t. Ingen nedrivning, skjult montering, gelænder eller overdækning inkluderet.

### tag — Tag: 120 m² grundplan, høj rejsning, tegl, gammelt paptag bortskaffes, hus fra 1975, 1-plan, stern + ingen kviste

**Spec (calculator input):** `{"amount":120,"floors":"1-plan (Stueplan)","roofPitch":"Høj rejsning / Normal hældning","houseAge":1975,"roofType":"Saddeltag (Almindeligt tag med 2 gavle)","gables":"Nej, de er murede / skal ikke skiftes","disposal":"Ja, tømreren skal afmontere OG bortskaffe det","oldRoofType":"Paptag","insulation":"Nej","eaves":"Ja, alt træværk langs kanten skiftes","chimney":"Nej","extensions":"Nej","skylights":"Nej","trailerAccess":"Ja","material":"Tegl"}`

**PATH A (Calculator):** hours=571, materialCost=120130 kr, finalPriceIncVat=596250 kr (596.250 kr. inkl. moms)

Calculator breakdown:
- Areal: Omregnet grundplan til anslået faktisk tagareal: ca. 174.0 m2
- Basis montering vurderet til ca. 243.6 arbejdstimer
- Materialer afregnet inkl. tillæg: 15% avance
- Miljøtillæg: Bortskaffelse af stort volumen (2x Containerleje/afhentning + 34.8 arbejdstimer) - Uden avance
- Risikoramme (+25% tid på basis-monteringen) lagt til pga. husets alder (ca. 51 år gammelt) – ældre huse har ofte skjulte konstruktionsproblemer
- Standard tillæg: Forventet materialespild (+10%) samt tag-montagematerialer (skruer, fugleklodser, rygningskit)
- Tillæg: Omfattende stillads/materiel-leje (skaleret efter m2) og forøget arbejdstid pga. husets plan/hældning
- Standard: Påforing/opretning af eksisterende spærlag samt montering af nyt undertag er obligatorisk inkluderet.
- Tillæg: Udskiftning af stern/udhæng (estimeret 45 løbende meter omkreds)
- Standard: Udskiftning til nye tagrender og nedløbsrør er inkluderet (estimeret 22 løbende meter).
- Kørsel & Logistik (Hovedgaden 1 ➜ Kundens adresse): 25.0 km hver vej.
- Slitage-takst (bil) samt lukkede timer under transport (Estimeret 38 dag(e)) udregnet til i alt: 28120 kr

**PATH B — claude/claude-sonnet-4-5:**
- hours=417, materialCost=80080 kr
- delta vs calc: hours -27.0%, materials -33.3% — **MAJOR**
- breakdown:
  - Afmontering og bortskaffelse af gammelt paptag: 36t / 3000 kr
  - Undertag (dug) 144 m2: 43t / 17280 kr
  - Nyt tegltag 144 m2: 202t / 18720 kr
  - Montagematerialer (skruer, fugleklodser, rygning): 0t / 10800 kr
  - Stern og udhæng 44 løbemeter: 18t / 6600 kr
  - Tagrender og nedløb 44 løbemeter: 15t / 11000 kr
  - Kantsikring/stillads 1-plan: 0t / 5400 kr
  - Opstart, opmåling og oprydning: 7t / 0 kr
  - Spild og ekstra materialer (10%): 0t / 7280 kr
  - Sikkerhedstillæg uforudsete forhindringer (30%): 96t / 0 kr
- reasoning (truncated):  PROJEKT: Nyt tegltag på 1-plans hus, 120 m2 grundplan, sadeltag normal hældning, hus fra 1975. OPGAVE: - Afmontere og bortskaffe gammelt paptag (ingen asbest) - Lægge nyt tegltag - Skifte stern og udhæng - Ingen skorsten, ingen kviste, ingen ovenlysvinduer - Gavle er murede og beholdes - Container kan stå ved huset MATERIALEBEREGNING: 1. Tagflade: - Grundplan: 120 m2 - Sadeltag normal hældning (~30-40 grader): Tagflade cirka 120 × 1.20 = 144 m2 - Tegl: 144 m2 × 130 kr = 18.720 kr - Undertag (dug): 144 m2 × 120 kr = 17.280 kr - Montagematerialer (skruer, fugleklodser, rygning): 144 m2 × 75 kr = 10.800 kr 2. Stern og udhæng: - Omfang af hus 120 m2 ≈ 11×11m = cirka 44 løbemeter - Stern træværk: 44 m × 150 kr = 6.600 kr 3. Tagrender og nedløb: - 44 m × 250 kr = 11.000 kr 4. Kantsikring/Rulles
**PATH B — openai/gpt-5.5:**
- hours=415, materialCost=66825 kr
- delta vs calc: hours -27.3%, materials -44.4% — **MAJOR**
- breakdown:
  - Nyt tegltag på 1-plans hus inkl. afmontering/bortskaffelse af eksisterende paptag, undertag, montering og udskiftning af stern/udhæng: 415t / 66825 kr
- reasoning (truncated): Tagareal estimeret som 120 m2 grundplan x ca. 1,25 for almindeligt saddeltag inkl. udhæng = ca. 150 m2 tagflade. Arbejdsfaser: klargøring/opstart 4 t, afmontering og bortskaffelse af gammelt paptag 150 m2 x 0,25 = 37,5 t, hovedtagarbejde tegl 150 m2 x 1,4 = 210 t, undertag 150 m2 x 0,3 = 45 t, stern/udhæng anslået ud fra ca. 44 lbm x 0,4 = 17,6 t, oprydning/slutfinish 5 t. Sum før uforudsete = 319,1 t. Tillæg 30% for uforudsete forhindringer = 414,83 t, afrundet til 415 t. Materialer: tegl 150 m2 x 130 = 19.500 kr, undertag 150 m2 x 120 = 18.000 kr, montagematerialer 150 m2 x 75 = 11.250 kr, stern træværk anslået 44 lbm x 150 = 6.600 kr, kant-/rullestillads 1-plan 120 m2 x 45 = 5.400 kr. Nettomaterialer = 60.750 kr. SOP spild/montagetillæg +10% = 66.825 kr.

### koekken — Køkken: 15 elementer, flat-pack (IKEA), træbordplade tilpasses, integrerede hvidevarer

**Spec (calculator input):** `{"disposal":"Nej, vi gør det selv / der er allerede tomt","kitchenBrand":"IKEA","ownMaterials":"Ja, jeg har allerede købt det (kun pris på montering)","assembly":"Flat-pack: Tømreren skal samle alle skabe og skuffer (fx IKEA/Kvik)","kitchenShape":"Vinkelkøkken (L-formet)","amount":15,"worktop":"Ja, træ/laminat som skal tilpasses på stedet","integratedAppliances":"Ja, der er integrerede træfronter"}`

**PATH A (Calculator):** hours=36, materialCost=0 kr, finalPriceIncVat=33750 kr (33.750 kr. inkl. moms)

Calculator breakdown:
- Basis montering vurderet til ca. 18.0 arbejdstimer
- Materialer er ikke medregnet i prisen (Kunden leverer selv)
- Tillæg: Samling af flat-pack / usamlede køkkenelementer
- Tillæg: Tilpasning og fræsning af træ/laminat bordplade inkl. vask/kogeplade
- Tillæg: Montering af træfronter på integrerede hvidevarer
- Kørsel & Logistik (Hovedgaden 1 ➜ Kundens adresse): 25.0 km hver vej.
- Slitage-takst (bil) samt lukkede timer under transport (Estimeret 3 dag(e)) udregnet til i alt: 2220 kr

**PATH B — claude/claude-sonnet-4-5:**
- hours=55, materialCost=11550 kr
- delta vs calc: hours 52.8%, materials Infinity% — **MAJOR**
- breakdown:
  - Samling og montering af 15 IKEA elementer (flat-pack): 30t / 2000 kr
  - Tilpasning og montering af træbordplade inkl. udskæringer: 4t / 8500 kr
  - Finjustering af integrerede hvidevarer med træfronter: 1.5t / 0 kr
  - Opstart, opmåling og finish: 7t / 1050 kr
  - Tillæg for uforudsete forhold (30%): 12.5t / 0 kr
- reasoning (truncated):  KØKKENPROJEKT - IKEA FLAT-PACK, 15 ELEMENTER, L-FORMET OPSUMMERING AF INFO: - Tomt rum (ingen nedrivning) - IKEA køkken, flat-pack (skal samles) - 15 elementer (skabe og skuffer) - L-formet vinkelkøkken - Bordplade i træ med udskæringer til vask og kogeplade - Integrerede hvidevarer med træfronter der skal finjusteres - Kunden står selv for indkøb af køkken TIMEBEREGNING: Database værdier: - hoursPerUnit (samling af element): 1.2t per element - assemblyHours (flat-pack tillæg): 0.8t per element - worktopHours (bordplade tilpasning): 4t - applianceHours (integrerede hvidevarer): 1.5t - disposalHours: 0t (intet at afmontere) Beregning: - Samling af 15 elementer: 15 × 1.2t = 18t - Flat-pack samling tillæg: 15 × 0.8t = 12t - Bordplade tilpasning og montering med udskæringer: 4t - Integrerede 
**PATH B — openai/gpt-5.5:**
- hours=61.8, materialCost=0 kr
- delta vs calc: hours 71.7%, materials 0.0% — **MAJOR**
- breakdown:
  - Montering af IKEA flat-pack L-køkken, 15 elementer inkl. samling af skabe/skuffer, opsætning, træbordplade med udskæringer samt finjustering af integrerede hvidevarer: 61.8t / 0 kr
- reasoning (truncated): KITCHEN beregning: 15 elementer. Samling flat-pack: 15 x 0,8 t = 12,0 t. Montering af skabe/skuffer/elementer: 15 x 1,2 t = 18,0 t. Bordplade i træ inkl. tilpasning og udskæringer til vask/kogeplade vurderet realistisk til 6,0 t (database worktopHours 4 t, tillagt ekstra for L-form og to udskæringer). Integrerede hvidevarer med fronter: antaget 3 stk. x 1,5 t = 4,5 t. Opstart/opmåling/planlægning: 3,0 t. Oprydning/slutfinish: 4,0 t. Subtotal: 47,5 t. Tillæg 30% for uforudsete forhindringer: 47,5 x 1,30 = 61,75 t, afrundet til 61,8 t. Materialer: kunden leverer køkken og bordplade; ingen materialeindkøb fra databasen medregnet. 10% spild på 0 kr = 0 kr.

### lofter — Lofter: 25 m² gipsloft, opvarmet etage over, ingen maler, standard højde

**Spec (calculator input):** `{"amount":25,"disposal":"Nej, vi monterer ovenpå / der er allerede tomt","vaporAndInsulation":"Opvarmet etage (Ingen dampspærre nødvendig)","material":"Gipsloft","plastering":"Nej, jeg finder selv en maler / gør det selv","ceilingHeight":"Nej, standard lofthøjde"}`

**PATH A (Calculator):** hours=28, materialCost=7188 kr, finalPriceIncVat=36250 kr (36.250 kr. inkl. moms)

Calculator breakdown:
- Basis montering vurderet til ca. 20.0 arbejdstimer
- Materialer afregnet inkl. tillæg: 15% avance
- Standard: Udskæring og tilpasning til spots og lampesteder er medregnet i tidsforbruget
- Standard: Forskalling (træskelet) til underlag for det nye loft
- Kørsel & Logistik (Hovedgaden 1 ➜ Kundens adresse): 25.0 km hver vej.
- Slitage-takst (bil) samt lukkede timer under transport (Estimeret 2 dag(e)) udregnet til i alt: 1480 kr

**PATH B — claude/claude-sonnet-4-5:**
- ERROR: no tool call
**PATH B — openai/gpt-5.5:**
- hours=48.1, materialCost=8113 kr
- delta vs calc: hours 71.8%, materials 12.9% — **MAJOR**
- breakdown:
  - Nyt gipsloft i stue, 25 m2, monteret på/under eksisterende loft inkl. forskalling, skyggelister/fuge, klargøring og oprydning. Uden nedrivning, dampspærre, isolering og malerarbejde.: 48.1t / 8113 kr
- reasoning (truncated): CEILINGS. Areal 25 m2. Nyt loft: gipsloft 200 kr/m2 = 5.000 kr. Forskalling 50 kr/m2 = 1.250 kr. Skyggelister/fuge 45 kr/m2 = 1.125 kr. Nettomaterialer 7.375 kr. SOP spild/montagematerialer +10% = 8.112,50 kr afrundet til 8.113 kr. Timer: basis montering gipsloft 0,8 t/m2 x 25 = 20 t. Forskalling 0,2 t/m2 x 25 = 5 t. Skyggelister/fuge 0,2 t/m2 x 25 = 5 t. Opstart/opmåling/klargøring 3 t. Oprydning/slutfinish 4 t. Subtotal 37 t. Uforudsete forhindringer +30% = 48,1 t. Ingen nedrivning, ingen dampspærre, ingen isolering, ingen maler.

### facade — Facade: 60 m² Thermowood, vandret, 1-plan, gammel træbeklædning rives ned, 4 åbninger

**Spec (calculator input):** `{"amount":60,"oldFacadeMaterial":"Gammel træbeklædning (Skal rives ned og fjernes)","material":"Thermowood","mountingStyle":"Vandret (fx Klinkbeklædning)","openings":4,"floors":"1-plan (Stueplan)"}`

**PATH A (Calculator):** hours=126, materialCost=57670 kr, finalPriceIncVat=180000 kr (180.000 kr. inkl. moms)

Calculator breakdown:
- Basis montering vurderet til ca. 72.0 arbejdstimer
- Materialer afregnet inkl. tillæg: 15% avance
- Miljøtillæg: Bortskaffelse af stort volumen (2x Containerleje/afhentning + 24.0 arbejdstimer) - Uden avance
- Standard: Montering af ny underkonstruktion (vindspærre og klemlister/afsætning)
- Tillæg: Udskæring og inddækning/lister omkring 4 vinduer/døre
- Kørsel & Logistik (Hovedgaden 1 ➜ Kundens adresse): 25.0 km hver vej.
- Slitage-takst (bil) samt lukkede timer under transport (Estimeret 9 dag(e)) udregnet til i alt: 6660 kr

**PATH B — claude/claude-sonnet-4-5:**
- hours=173, materialCost=65380 kr
- delta vs calc: hours 37.3%, materials 13.4% — **MAJOR**
- breakdown:
  - Nedrivning af gammel træbeklædning: 24t / 0 kr
  - Thermowood facadebeklædning inkl. vindspærre og klemlister (60 m2): 96t / 50380 kr
  - Inddækning og lister ved vinduer/døre (4 stk): 6t / 2000 kr
  - Facadestilladsleje: 0t / 15000 kr
  - Opstart, besigtigelse og oprydning: 7t / 0 kr
  - Tillæg for uforudsete forhold (30%): 40t / 0 kr
- reasoning (truncated):  OPGAVE: Ny træfacade i Thermowood, 60 m2, vandret montering (klinkbeklædning), 1-plans hus. - Nedrivning af gammel træbeklædning - 4 vinduer/døre skal have nye lister/inddækning MATERIALE-BEREGNING: 1. Thermowood facadebeklædning: 60 m2 × 600 kr/m2 = 36.000 kr 2. Vindspærre og klemlister: 60 m2 × 130 kr/m2 = 7.800 kr 3. Inddækning/lister (4 åbninger): 4 × 500 kr = 2.000 kr 4. SOP #2 SPILD (10% oveni): (36.000 + 7.800 + 2.000) × 1.10 = 50.380 kr 5. Facadestilladsleje (1-plan, men 60 m2 er betydelig opgave): 15.000 kr TOTAL MATERIALER: 50.380 + 15.000 = 65.380 kr ARBEJDSTIMER: 1. Opstart/opmåling/besigtigelse: 3 timer 2. Nedrivning gammel facade: 60 m2 × 0.4 t/m2 = 24 timer 3. Montering vindspærre/klemlister: 60 m2 × 0.4 t/m2 = 24 timer 4. Montering Thermowood facadebeklædning: 60 m2 × 1.2 
**PATH B — openai/gpt-5.5:**
- hours=172.9, materialCost=65380 kr
- delta vs calc: hours 37.2%, materials 13.4% — **MAJOR**
- breakdown:
  - Klargøring samt nedtagning og bortskaffelse af eksisterende træbeklædning: 35.1t / 0 kr
  - Ny træfacade i Thermowood, vandret klinkbeklædning, inkl. vindspærre/klemlister, montering, adgangsmateriel og oprydning: 130t / 63180 kr
  - Tilpasning, lister og inddækning omkring 4 vinduer/døre: 7.8t / 2200 kr
- reasoning (truncated): FACADES. Input: 60 m2 facade, Thermowood, vandret klinkbeklædning, gammel træbeklædning nedtages og fjernes, 1-plan, 4 vinduer/døre med nye lister/inddækninger. Materialer: Thermowood 60*600=36.000 kr. Vindspærre og klemlister 60*130=7.800 kr. Inddækning/lister 4*500=2.000 kr. Nettomaterialer 45.800 kr. +10% spild/montagematerialer = 50.380 kr. Adgang/stillads/bukke realistisk facadearbejde 15.000 kr. Samlet materialer 65.380 kr. Timer: montage facade 60*1,2=72 t. Nedtagning/bortskaffelse 60*0,4=24 t. Vindspærre/klemlister 60*0,4=24 t. Åbninger 4*1,5=6 t. Opstart/opmåling 3 t. Oprydning/slutfinish 4 t. Subtotal 133 t. +30% uforudsete = 172,9 t. Breakdown fordelt proportionalt: nedtagning/klargøring 35,1 t, facade inkl vindspærre/oprydning 130,0 t, åbninger 7,8 t.

### anneks — Anneks: 12 m² isoleret skur/værksted, Thermowood, sadel tag, ingen nedrivning

**Spec (calculator input):** `{"annexType":"Isoleret skur/værksted","amount":12,"disposal":"Nej, der er frit","material":"Thermowood","roofType":"Sadel tag (Høj rejsning)"}`

**PATH A (Calculator):** hours=112, materialCost=78660 kr, finalPriceIncVat=195000 kr (195.000 kr. inkl. moms)

Calculator breakdown:
- Basis montering vurderet til ca. 72.0 arbejdstimer
- Materialer afregnet inkl. tillæg: 15% avance
- Tillæg: Fuld isolering og beklædning indvendigt medregnet
- Tillæg: Sadel tag med rejsning i stedet for simpelt fladt tag
- Standard tillæg: Forventet materialespild (+10%) samt montagematerialer (skruer, beslag, fuge)
- Kørsel & Logistik (Hovedgaden 1 ➜ Kundens adresse): 25.0 km hver vej.
- Slitage-takst (bil) samt lukkede timer under transport (Estimeret 8 dag(e)) udregnet til i alt: 5920 kr

**PATH B — claude/claude-sonnet-4-5:**
- hours=103, materialCost=72000 kr
- delta vs calc: hours -8.0%, materials -8.5% — **PARITY**
- breakdown:
  - Anneks grundkonstruktion 12 m² i Thermowood: 72t / 48000 kr
  - Isolering og værkstedsudstyr: 0t / 9600 kr
  - Sadeltag med rejsning inkl. tagbelægning: 0t / 7860 kr
  - Opstart, opmåling og planlægning: 3t / 2540 kr
  - Oprydning og finish: 4t / 0 kr
  - Buffer til uforudsete forhold (30%): 24t / 4000 kr
- reasoning (truncated):  Okay, lad mig arbejde mig gennem dette anneksprojekt systematisk: PROJEKTSPECIFIKATIONER: - 12 m² anneks - Isoleret værksted (ikke fuld beboelse) - Intet skal rives ned - Facader: Thermowood - Sadeltag med rejsning - Ingen specifikke detaljer oplyst om tagtype, men jeg antager standard tagpap MATERIALEBEREGNING: 1. GRUNDKONSTRUKTION (12 m²):    - Thermowood facader: 4.000 kr/m² (fra database)    - 12 m² × 4.000 kr = 48.000 kr     2. ISOLERING/VÆRKSTED TILLÆG:    - Isolering/værksted tillæg: 800 kr/m² (fra database)    - 12 m² × 800 kr = 9.600 kr 3. SADELTAG TILLÆG:    - Sadeltag tillæg: 500 kr/m² (fra database)    - 12 m² × 500 kr = 6.000 kr 4. TAGBELÆGNING (antager tagpap som standard):    - Paptag: 80 kr/m² + montagematerialer 75 kr/m²    - 12 m² × 155 kr = 1.860 kr SUBTOTAL MATERIALER:
**PATH B — openai/gpt-5.5:**
- hours=126.1, materialCost=69960 kr
- delta vs calc: hours 12.6%, materials -11.1% — **DRIFT**
- breakdown:
  - Nyt isoleret anneks/værksted på 12 m² med Thermowood-facader og sadeltag: 126.1t / 69960 kr
- reasoning (truncated): ANNEX: 12 m². Materialer: Thermowood 4.000 kr/m² x 12 = 48.000 kr. Isoleret værkstedstillæg 800 kr/m² x 12 = 9.600 kr. Sadeltagstillæg 500 kr/m² x 12 = 6.000 kr. Nettomaterialer 63.600 kr. SOP spild/montage +10% = 69.960 kr. Timer: basis anneks 6 t/m² x 12 = 72 t. Tillæg for isolering/indvendig værkstedsopbygning anslået 12 t. Tillæg for sadeltag/rejsning anslået 6 t. Opstart/opmåling 3 t. Oprydning/slutfinish 4 t. Subtotal 97 t. SOP uforudsete +30% = 126,1 t.

### carport — Carport: 1 enkelt carport i trykimprægneret, fladt tag, ingen skur, ingen nedrivning

**Spec (calculator input):** `{"amount":"1","disposal":"Nej, der er frit","carportType":"Enkelt carport (Oftest 1 bil)","shedType":"Nej","material":"Trykimprægneret","roofType":"Fladt tag / ensidig hældning (Tagpap)"}`

**PATH A (Calculator):** hours=40, materialCost=22770 kr, finalPriceIncVat=65000 kr (65.000 kr. inkl. moms)

Calculator breakdown:
- Basis montering vurderet til ca. 40.0 arbejdstimer
- Materialer afregnet inkl. tillæg: 15% avance
- Standard tillæg: Forventet materialespild (+10%) samt montagematerialer (skruer, beslag, stolpesko)
- Kørsel & Logistik (Hovedgaden 1 ➜ Kundens adresse): 25.0 km hver vej.
- Slitage-takst (bil) samt lukkede timer under transport (Estimeret 3 dag(e)) udregnet til i alt: 2220 kr

**PATH B — claude/claude-sonnet-4-5:**
- hours=61, materialCost=19800 kr
- delta vs calc: hours 52.5%, materials -13.0% — **MAJOR**
- breakdown:
  - Carport konstruktion inkl. fladt tag med tagpap: 52t / 19800 kr
  - Opstart, opmåling og forberedelse: 4t / 0 kr
  - Oprydning og finish: 5t / 0 kr
- reasoning (truncated):  Okay, lad mig udregne et realistisk overslag for en enkelt carport i trykimprægneret træ med fladt tag og tagpap. Ingen nedrivning, ingen redskabsskur. MATERIALER: - Basis enkelt carport i trykimprægneret træ: 18.000 kr (fra databasen) - Fladt tag er standard (sadeltag koster ekstra 8.000 kr, men det er ikke aktuelt her) - Ingen nedrivning - Ingen redskabsskur Netto materiale: 18.000 kr + 10% spild og montagematerialer (SOP #2): 18.000 × 1.10 = 19.800 kr Total materialomkostning: 19.800 kr TIMER: - Basis carport montering: 40 timer (hoursPerUnit fra database) - Opstart, besigtigelse og opmåling: +3 timer - Oprydning og finish: +4 timer - Subtotal: 47 timer - Gang med 1.30 for uforudsete forhindringer (SOP): 47 × 1.30 = 61.1 timer Total arbejdstimer: 61 timer (afrundet) BREAKDOWN: 1. Carpo
**PATH B — openai/gpt-5.5:**
- hours=61.1, materialCost=19800 kr
- delta vs calc: hours 52.8%, materials -13.0% — **MAJOR**
- breakdown:
  - Ny enkelt carport i trykimprægneret træ med fladt tag/tagpap, uden integreret skur og uden nedrivning: 61.1t / 19800 kr
- reasoning (truncated): CARPORT standardopgave. Database: Trykimprægneret enkelt carport materialer 18.000 kr. SOP spild/materialer +10% = 19.800 kr. Tid: base carport hoursPerUnit 40 t. Ingen nedrivning. Opstart/besigtigelse/opmåling 3 t. Oprydning/slutfinish 4 t. Subtotal 47 t. Uforudsete 30%: 47 * 1,30 = 61,1 t. Fladt tag/tagpap er standard i grundposten; intet sadeltagstillæg. Ingen skur og ingen nedrivningstillæg.

### hegn — Hegn: 30 lbm klinkehegn, under 1,8 m, ingen nedrivning

**Spec (calculator input):** `{"amount":30,"disposal":"Nej, der er frit","fenceHeight":"Under 1,8 meter","material":"Klinkehegn (Træ)"}`

**PATH A (Calculator):** hours=24, materialCost=20873 kr, finalPriceIncVat=51250 kr (51.250 kr. inkl. moms)

Calculator breakdown:
- Basis montering vurderet til ca. 24.0 arbejdstimer
- Materialer afregnet inkl. tillæg: 15% avance
- Standard tillæg: Forventet materialespild (+10%) samt montagematerialer (skruer, stolpebeton, beslag)
- Kørsel & Logistik (Hovedgaden 1 ➜ Kundens adresse): 25.0 km hver vej.
- Slitage-takst (bil) samt lukkede timer under transport (Estimeret 2 dag(e)) udregnet til i alt: 1480 kr

**PATH B — claude/claude-sonnet-4-5:**
- hours=39, materialCost=18150 kr
- delta vs calc: hours 62.5%, materials -13.0% — **MAJOR**
- breakdown:
  - 30 meter klinkehegn i træ under 1,8m: 24t / 16500 kr
  - Opstart, opmåling og klargøring: 3t / 0 kr
  - Oprydning og finish: 3t / 0 kr
  - Spild og montagematerialer (10%): 0t / 1650 kr
  - Buffer til uforudsete forhold (30%): 9t / 0 kr
- reasoning (truncated):  OPGAVE: 30 løbende meter klinkehegn i træ, under 1,8m højt, intet eksisterende hegn skal fjernes, ingen specielle udfordringer nævnt. MATERIALER: - Klinkehegn (Træ): 550 kr/m × 30m = 16.500 kr - Stolpebeton, skruer, beslag osv. er inkluderet i +10% spild/montagematerialer - Materialer netto: 16.500 kr - Spild og montagematerialer +10%: 16.500 × 1.10 = 18.150 kr TIMER: Basistimer: - Opsætning: 0.8t/m × 30m = 24 timer - Opstart, besigtigelse, opmåling: 3 timer - Oprydning og finish: 3 timer - Subtotal: 24 + 3 + 3 = 30 timer Tillæg 30% til uforudsete forhindringer: 30t × 1.30 = 39 timer TOTAL: - Materialer: 18.150 kr - Timer: 39 timer 
**PATH B — openai/gpt-5.5:**
- hours=40.3, materialCost=18150 kr
- delta vs calc: hours 67.9%, materials -13.0% — **MAJOR**
- breakdown:
  - Opsætning af 30 lbm klinkehegn i træ under 1,8 m, inkl. opstart/opmåling, stolper, montering, finish og oprydning: 40.3t / 18150 kr
- reasoning (truncated): FENCE: 30 lbm klinkehegn. Materialepris fra database: Klinkehegn (Træ) 550 kr/lbm. Nettomaterialer: 30 x 550 = 16.500 kr. SOP spild/montagematerialer +10%: 16.500 x 1,10 = 18.150 kr. Ingen eksisterende hegn, derfor ingen bortskaffelse. Højde under 1,8 m, derfor intet højdetillæg. Arbejdstid fra database: 0,8 t/lbm x 30 = 24 t. Opstart/besigtigelse/opmåling lagt til 3 t. Oprydning/slutfinish lagt til 4 t. Subtotal timer: 31 t. Uforudsete forhold +30%: 31 x 1,30 = 40,3 t.

## Root-cause analysis

- 1. **AI omits the hidden buffer (5k–15k DKK) and the calibration factor.** The calculator's `hiddenBuffer` (5k base, 10k if strictPrice>50k, 15k if >150k) and `calibFactor` are not surfaced in the AI prompt at all. AI only returns laborHours + materialCost — the prompt never tells it to add a buffer in DKK.
- 2. **AI prompt double-counts material markup (or omits it).** Calculator applies `materialMarkup` (×1.15) to all non-environmental materials INSIDE its rules. AI is told to add '+10% spild' on top of the LIVE materialepriser (which are raw indkøb without markup). So AI returns net materials × 1.10 whereas calc returns net × 1.10 (spild) × 1.15 (markup) — a structural ~15% under-count on materials by AI.
- 3. **AI applies a flat ×1.30 hours multiplier** (per prompt rule 'GANG ALTID DIT ENDELIGE TIMEESTIMAT MED 1.30'). Calculator does NOT apply a global 30% multiplier — it has category-specific tillæg (risk_margin only on roof age, etc). So on simple categories (hegn, gulv, lofter) AI hours are ~30% high; on roof with old house AI may be under because calculator separately adds risk_margin × initialInstallHours.
- 4. **AI misses driving + crew + workday logic entirely.** The calculator estimates days, applies `effectiveCrew` (=2 above 20h) and bills driving as material (`drivingMaterialCost`) and labor (`drivingLaborCost`). The AI is explicitly told 'KØRSEL udregnes automatisk' — so AI hours exclude driving, but AI also cannot see the crew multiplier which reduces days (and thus driving cost) above 20h.
- 5. **AI startup/oprydning hours (2-4 + 3-5) are hardcoded in prompt and roughly double-counted vs calculator.** Calculator instead bakes setup/finish into the per-unit rate (`hoursPerUnit`) and only adds explicit oprydning when category logic dictates. So AI tends to add 5-9 fixed hours on every job; calculator does not. On small jobs (≤4h) calculator floors to 4h, but AI floors typically higher.
- 6. **Category-specific extras the AI cannot see.** Many calculator branches add items the AI cannot infer from the chat alone: floor cat adds obligatory levelingHours + underlay + skirting + a 7% spild factor; roof adds gutters in lbm (estimated from grundplan), obligatory undertag + spæropretning; terrace adds obligatory groundFoundationHours; ceilings/facades add obligatory forskalling/vindspærre. AI sometimes spots these from the prompt rules but the prompt does not enumerate them explicitly.

## Aggregate verdict per model

- **claude/claude-sonnet-4-5**: PARITY=1, DRIFT=1, MAJOR=8, ERR=1
- **openai/gpt-5.5**: PARITY=0, DRIFT=1, MAJOR=10, ERR=0