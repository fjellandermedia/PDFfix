# uf-bilder

Bildlager för UF-företagens logotyper och bilder. Power Automate laddar upp
originalbilder till `inbox/`, ett GitHub Actions-workflow skalar dem till kvadrat
och skriver en JSON-fil per bild i `bilder/` med bilden som Base64-sträng, som
Power Automate sedan läser tillbaka.

> **Repot ska vara privat.** Bilderna och JSON-filerna är inte avsedda att
> publiceras direkt från GitHub.

## Struktur

| Sökväg | Innehåll |
|---|---|
| `inbox/` | Uppladdade originalbilder. **Filnamnet är företagets ID**, t.ex. `lyktan-uf.jpg`. |
| `bilder/` | Resultat: en JSON-fil per bild, t.ex. `bilder/lyktan-uf.json`. |
| `skript/skala.py` | Bildbehandlingen (Python 3.12, Pillow). |
| `.github/workflows/bilder.yml` | Workflowet "Skala bilder" som kör skriptet vid push till `inbox/`. |

Tillåtna bildformat i `inbox/`: jpg, jpeg, png, webp, gif, bmp, tif, tiff.

## Vad skriptet gör

För varje bild i `inbox/`:

1. Roterar rätt enligt EXIF (bilder från mobilkameror).
2. Konverterar till RGB (genomskinlighet blir vit).
3. Beskär och skalar till 640×640 pixlar, centrerat, med LANCZOS.
4. Sparar som progressiv JPEG med kvalitet 75.
5. Skriver `bilder/<id>.json`:

```json
{
 "id": "lyktan-uf",
 "dataUri": "data:image/jpeg;base64,/9j/4AAQ...",
 "bytes": 48213,
 "size": 640,
 "kalla": "lyktan-uf.jpg",
 "sha256": "<sha256 av originalfilen>",
 "skapad": "2026-11-06T12:34:56+00:00"
}
```

Bilder vars `sha256` redan matchar befintlig JSON hoppas över, så det är billigt att
köra om workflowet. Med `--alla` görs alla bilder om.

Köra lokalt:

```bash
pip install Pillow
python skript/skala.py --inbox inbox --ut bilder --size 640 --quality 75
```

## Skapa en token för Power Automate

Använd en *fine-grained personal access token* som bara kommer åt detta repo.

1. Gå till GitHub → **Settings** → **Developer settings** → **Personal access tokens**
   → **Fine-grained tokens** → **Generate new token**.
2. Ge den ett namn (t.ex. `power-automate-uf-bilder`) och ett utgångsdatum.
3. **Resource owner**: ägaren till repot (t.ex. `fjellandermedia`).
4. **Repository access**: *Only select repositories* → välj `uf-bilder`.
5. **Permissions** → **Repository permissions** → **Contents**: *Read and write*.
   (Metadata: Read-only läggs till automatiskt.)
6. Generera och kopiera tokenen. Spara den som en säker inmatning / i Azure Key Vault
   i Power Automate; den visas bara en gång.

Är repot ägt av en organisation kan en administratör behöva godkänna tokenen.

## Power Automate-anrop

Alla anrop görs med HTTP-åtgärden i Power Automate och dessa huvuden:

| Huvud | Värde |
|---|---|
| `Authorization` | `Bearer <token>` |
| `Accept` | `application/vnd.github+json` (vid läsning av resultat: se nedan) |
| `X-GitHub-Api-Version` | `2022-11-28` |

Byt ut `ÄGARE` mot repots ägare och `<id>` mot företagets ID.

### Ladda upp en bild

```
PUT https://api.github.com/repos/ÄGARE/uf-bilder/contents/inbox/<id>.jpg
```

Body:

```json
{
  "message": "Ny bild för <id>",
  "content": "<base64 av filen>"
}
```

I Power Automate får du Base64 av filinnehållet med t.ex. `base64(body('Hämta_filinnehåll'))`
(eller `base64(triggerBody()?['fil'])` från ett formulär). Filändelsen ska stämma med
bildens format.

**Om filen redan finns** svarar GitHub med `422`. Då måste du skicka med filens `sha`:

1. Gör först `GET` mot samma adress (`.../contents/inbox/<id>.jpg`).
2. Finns filen får du tillbaka ett JSON-objekt med fältet `sha`
   (`body('HTTP_GET')?['sha']`). Finns den inte får du `404`.
3. Lägg till `"sha": "<sha>"` i bodyn till `PUT`:

```json
{
  "message": "Uppdaterad bild för <id>",
  "content": "<base64 av filen>",
  "sha": "<sha från GET>"
}
```

Pushen till `inbox/` startar workflowet automatiskt.

### Läsa resultatet

Vänta **minst 1–2 minuter** efter uppladdningen (workflowet behöver tid att köra).
Hämta sedan JSON-filen rakt av med `Accept: application/vnd.github.raw+json`:

```
GET https://api.github.com/repos/ÄGARE/uf-bilder/contents/bilder/<id>.json
Authorization: Bearer <token>
Accept: application/vnd.github.raw+json
X-GitHub-Api-Version: 2022-11-28
```

Svaret är själva JSON-filen, så `body('HTTP')?['dataUri']` är strängen du kan använda
direkt i `<img src="...">`, t.ex. i ett e-postmeddelande eller en adaptiv kortvy:

```html
<img src="@{body('HTTP')?['dataUri']}" width="320" height="320" alt="@{body('HTTP')?['id']}">
```

Får du `404` har workflowet inte hunnit klart ännu (eller misslyckats). Lägg gärna
anropet i en *Do until*-loop med fördröjning som provar igen några gånger.

## Köra om alla bilder manuellt

1. Öppna fliken **Actions** i repot.
2. Välj workflowet **Skala bilder** i listan till vänster.
3. Klicka **Run workflow** → **Run workflow**.

Workflowet hoppar över bilder som är oförändrade. Vill du göra om *alla* bilder
(t.ex. efter ändrad storlek eller kvalitet) kan du ändra parametrarna i
`.github/workflows/bilder.yml` och lägga till `--alla` på kommandoraden, eller köra
skriptet lokalt med `--alla` och pusha `bilder/`.
