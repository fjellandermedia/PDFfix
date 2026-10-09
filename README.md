# Skrivhäftesfix

En webbsida som delar skannade A3-skrivhäften i stående A4-sidor och sorterar om dem i läsordning.
Allt sker i webbläsaren. Ingen fil skickas någonstans och ingen webbserver behövs.

## Så här använder du den

1. Öppna `index.html` (se nedan).
2. Välj eller släpp en pdf-fil med skannade skrivhäften (en liggande A3-sida per uppslag).
3. Kontrollera inställningarna:
   - **Ny ordning per häfte**: standard är `4,1,2,3`, det vill säga ny sida 1 = gammal sida 4,
     ny sida 2 = gammal sida 1, ny sida 3 = gammal sida 2, ny sida 4 = gammal sida 3.
     Välj `2,3,4,1` om utsidan av häftet skannades först. Du kan också skriva en egen ordning,
     till exempel `2,3,6,7,8,5,4,1` för häften med två ark (åtta sidor). Antalet tal avgör gruppstorleken.
   - **Dela bara liggande sidor**: stående sidor i filen lämnas hela.
   - **Byt plats på vänster och höger halva**: prova om sidorna hamnar parvis fel.
4. Klicka på **Dela och sortera**, titta på förhandsgranskningen och klicka på **Ladda ner resultatet**.

Delningen görs utan att bilderna packas om, så kvaliteten blir densamma som i originalet.

## Köra lokalt

Ladda ner repot (grön knapp **Code → Download ZIP** på GitHub, eller `git clone`), packa upp och
dubbelklicka på `index.html`. Mappen `vendor` måste ligga kvar bredvid filen.
Fungerar i Chrome, Edge, Firefox och Safari utan internetanslutning.

## Köra via GitHub Pages

1. Gå till repots **Settings → Pages**.
2. Under **Build and deployment** väljer du **Source: Deploy from a branch**.
3. Välj grenen (till exempel `main`) och mappen `/ (root)`. Spara.
4. Efter någon minut finns sidan på `https://<användarnamn>.github.io/<repo>/`.

## Teknik

- [pdf-lib](https://pdf-lib.js.org/) klipper sidorna (via sidrutor, utan omkodning) och bygger den nya pdf-filen.
- [pdf.js](https://mozilla.github.io/pdf.js/) ritar förhandsgranskningen.
- Båda biblioteken ligger i `vendor/` så att sidan fungerar utan nätverk. Licenser finns i samma mapp.
