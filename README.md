# PDFfix

Två små verktyg för skannade prov. Allt sker i webbläsaren. Ingen fil skickas någonstans och ingen webbserver behövs.
Växla mellan verktygen med flikarna överst på sidan.

## Dela skrivhäften (`index.html`)

Delar skannade A3-skrivhäften i stående A4-sidor och sorterar om dem i läsordning.

1. Välj eller släpp en pdf-fil med skannade skrivhäften (en liggande A3-sida per uppslag).
2. Kontrollera inställningarna:
   - **Ny ordning per häfte**: standard är `2,3,4,1`, det vill säga ny sida 1 = gammal sida 2,
     ny sida 2 = gammal sida 3, ny sida 3 = gammal sida 4, ny sida 4 = gammal sida 1. Det passar när
     utsidan av häftet skannades först (uppslagen kommer då som 4|1 och 2|3).
     Välj `4,1,2,3` om insidan skannades först. Du kan också skriva en egen ordning,
     till exempel `2,3,6,7,8,5,4,1` för häften med två ark (åtta sidor). Antalet tal avgör gruppstorleken.
   - **Uppdelning i filer**: standard är *Alla sidor i en fil*. Välj *Ett ark per fil (4 sidor)*,
     *Två ark per fil (8 sidor)* eller *Eget antal sidor per fil* för att få en pdf per häfte.
     Du får då en zip-fil med alla häften samt länkar till varje enskild fil.
     Filerna heter `<original>-hafte-1.pdf`, `<original>-hafte-2.pdf` och så vidare.
   - **Dela bara liggande sidor**: stående sidor i filen lämnas hela.
   - **Byt plats på vänster och höger halva**: prova om sidorna hamnar parvis fel.
3. Klicka på **Dela och sortera** och titta på förhandsgranskningen.
4. Ta bort sidor du inte vill ha med, till exempel tomma sidor, genom att klicka på krysset uppe till höger
   på sidan. Klicka igen för att ångra. Filerna byggs om automatiskt, och en borttagen sida påverkar bara
   det häfte den hör till.
5. Klicka på **Ladda ner resultatet** (eller **Ladda ner alla som zip** om du valt uppdelning per häfte).

Delningen görs utan att bilderna packas om, så kvaliteten blir densamma som i originalet.

## Kombinera provdelar (`kombinera.html`)

Sätter ihop varje elevs provdelar från två pdf-filer till en pdf per elev.
Del 1 är en pdf där alla elevers första provdel ligger efter varandra, del 2 en pdf där alla elevers
andra provdel ligger i samma elevordning.

1. Välj pdf-filen för del 1 och ange hur många sidor varje elev har i den (till exempel 2).
2. Välj pdf-filen för del 2 och ange hur många sidor varje elev har i den (till exempel 4).
   Du kan också använda bara en av delarna om du enbart vill dela upp en pdf per elev.
3. Ange vad filerna ska heta. Standard är `elev`, vilket ger `elev-01.pdf`, `elev-02.pdf` och så vidare.
4. Klicka på **Sätt ihop per elev**. Varje elevs pdf får först sidorna från del 1 och sedan sidorna från del 2.
5. Kontrollera förhandsgranskningen per elev (sidor från del 2 har blå ram) och ta bort enstaka sidor
   med krysset uppe till höger. Filerna byggs om automatiskt.
6. Klicka på **Ladda ner alla som zip** eller hämta enskilda elever under **Ladda ner enskilda filer**.

Om sidantalet inte går jämnt upp, eller om delarna ger olika många elever, visas en varning
så att du kan kontrollera inställningarna.

## Köra lokalt

Ladda ner repot (grön knapp **Code → Download ZIP** på GitHub, eller `git clone`), packa upp och
dubbelklicka på `index.html`. Övriga filer (`kombinera.html`, `style.css`, `common.js` och mappen `vendor`)
måste ligga kvar bredvid. Fungerar i Chrome, Edge, Firefox och Safari utan internetanslutning.

## Köra via GitHub Pages

1. Gå till repots **Settings → Pages**.
2. Under **Build and deployment** väljer du **Source: Deploy from a branch**.
3. Välj grenen och mappen `/ (root)`. Spara.
4. Efter någon minut finns sidan på `https://<användarnamn>.github.io/<repo>/`.

## Teknik

- [pdf-lib](https://pdf-lib.js.org/) klipper och kopierar sidorna (utan omkodning) och bygger de nya pdf-filerna.
- [pdf.js](https://mozilla.github.io/pdf.js/) ritar förhandsgranskningarna direkt från originalfilerna.
- Zip-filerna skapas av en liten inbyggd zip-skrivare utan komprimering (pdf-filer är redan komprimerade).
- `common.js` innehåller det som delas mellan verktygen, `style.css` utseendet.
- Båda biblioteken ligger i `vendor/` så att sidan fungerar utan nätverk. Licenser finns i samma mapp.
