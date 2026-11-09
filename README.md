# Ljusarkiv – smal första version (MVP)

Webbapp för ljusdesigners och tillverkare. Byggd med Next.js 15 (App Router), TypeScript och PostgreSQL. Gränssnittet är på svenska.

## Det här finns

**Designer**
- Registrering och inloggning
- Sök med filter (typ, tillverkare, effekt, ljusflöde, färgtemperatur, skyddsklass, montering, dimbar, provarmatur) och sortering
- Jämförelse av 2–4 armaturer (bästa värde markeras, lm/W räknas ut)
- Armatursida med länk till tillverkarens egen produktsida
- Projekt: lägg armaturer med zon och anteckning, flytta mellan projekt, ta bort
- Offertförfrågan och provarmaturförfrågan, med status och svar från tillverkaren

**Tillverkare**
- Registrering (kontot måste godkännas av dig innan produkterna syns för designers)
- Lägg till, redigera och ta bort produkter
- Läs in en **.ldt- eller .ies-fil** för att fylla i effekt, ljusflöde, ljusvinkel, artikelnummer och mått
- Svara på offertförfrågningar, hantera provarmaturer (Godkänd → Skickad → Återlämnad, eller Avvisad)

## Det här finns inte (medvetet)

Team och delade projekt, gäster, community/frågor och svar, statistik, import av många produkter på en gång, e-postnotiser, lösenordsåterställning, betalning, GDPR-verktyg (export/radering av konto), administratörsgränssnitt (godkännande sker via ett skript), AI-sök. Bygg dem först när riktiga användare ber om dem.

## Kom igång

Krav: Node 20+ och PostgreSQL 14+.

```bash
npm install
cp .env.example .env.local      # sätt DATABASE_URL och en lång SESSION_SECRET
createdb ljusarkiv              # eller skapa databasen på annat sätt
npm run db:migrate              # skapar tabellerna
npm run db:seed                 # DEMODATA (påhittade tillverkare) – bara för test
npm run dev                     # http://localhost:3000
```

Demoinloggningar (lösenord `demo-losenord-1`): `designer@demo.test`, `lumera@demo.test`, `nordvik@demo.test`.
**Ta bort demodatan innan riktig användning.** Alla demotillverkare och produkter är påhittade.

### Godkänna tillverkare
```bash
node scripts/godkann.mjs        # lista konton som väntar
node scripts/godkann.mjs 7      # godkänn företag med id 7
```

### Produktion
`npm run build && npm start`. Sätt `SESSION_SECRET` till ett slumpvärde (`openssl rand -hex 32`), kör bakom HTTPS och använd en hanterad PostgreSQL (t.ex. Supabase – ange då dess anslutningssträng i `DATABASE_URL`).

## Fotometrifiler (LDT/IES)

`lib/photometry.ts` läser Eulumdat (.ldt) och IES LM-63 (.ies). Filerna innehåller effekt, ljusflöde, mått och ljusfördelning men normalt inte skyddsklass, CRI, montering, bild eller pris. Testa: `npm run test:ljus`.

Filerna i `samples/` är **syntetiska testfiler**, inte verkliga produkter. Parsern är testad på dem men inte på riktiga tillverkarfiler – prova med några riktiga och kontrollera värdena mot databladet. Spara och visa bara tillverkares filer med deras tillstånd.

## Säkerhet (det som finns)
- Lösenord hashas med bcrypt; sessioner är signerade, httpOnly-cookies
- Alla databasfrågor är parametriserade
- Varje fråga är begränsad till inloggad användare/företag (designers ser bara sina projekt och förfrågningar, tillverkare bara sina produkter och förfrågningar)
- Bara http(s)-länkar accepteras för produktlänkar och bilder
- Saknas: begränsning av inloggningsförsök (rate limiting), e-postverifiering, CSRF-skydd utöver Next.js egna kontroll av Server Actions. Lägg till innan publik lansering.
- `npm audit` rapporterar en sårbarhet i PostCSS som följer med Next.js. Den berör bygget av CSS, inte appens körtid. Uppgradera Next.js när en rättad version finns.

## Juridik och data
Appen hämtar ingen data från tillverkares webbplatser. Produkter läggs in av tillverkaren själv eller av dig med tillverkarens skriftliga tillstånd. Låt en jurist granska villkor, integritetspolicy och hur ni hanterar tillverkares filer och bilder innan ni går live.

## Struktur
```
app/            sidor (sök, jämför, armatur, projekt, förfrågningar, tillverkare)
lib/actions/    serveråtgärder (inloggning, designer, tillverkare)
lib/            db, auth, valideringsfunktioner, fotometri
db/schema.sql   databasschema
scripts/        migrate, seed, godkann, test-photometry
```
