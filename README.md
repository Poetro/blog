# A Node.js bemutatása egy blog motoron keresztül

---

## Node.js (http://nodejs.org/)

- Esemény vezérelt, nem blokkoló I/O rendszer
- Hasonló rendszerek: Twisted (Python), EventMachine (Ruby), Ver.x (JavaScript, Java, Ruby, Groovy, Python, Clojure, Ceylon)
- C++-ban és JavaScript-ben van írva
- A Google V8 motorjára épül (http://code.google.com/p/v8/)
- CommonJS alapú modul rendszer
  - C++-ban és/vagy JavaScript-ben íródtak
  - Magunk is írhatunk ilyen modulokat
- „Hivatalos” modul kezelő az npm (http://npmjs.org/)
- Aktuális verziók, változatok (2015. április 21.):
  - Node.js: v0.12.2
  - io.js: v1.8.1

---

## Telepítés

- Windows, Linux, OSX, SunOS-re letölthetők telepíthető binárisok [nodejs.org/download](https://nodejs.org/download/)
- Telepíthető csomagkezelőkből (`apt-get`, `yum`, `pkg`, `brew`, `port`...)
- Forrásból fordítható további operációs rendszerekre, architektúrákra (AIX, ARM...)

---

## Fontosabb beépített modulok

- `util`: Loggolás, öröklődés, hibakeresés
- `fs`: fájlrendszer
- `http(s)`: HTTP(S) kliens és kiszolgáló
- `net`: hálózati feladatok (socketek, streamek, kliens és kiszolgáló)
- `crypto`: titkosítás, kódolás (md5, sha1, rsa, sha256 stb.)
- `path`: fájlrendszer elérési utakhoz
- `url`: URL kezeléshez
- `querystring`: Az URL query részének kezeléséhez
- `process`: folyamatok vezérléséhez, információinak eléréséhez
- `stream`: adatfolyamok vezérléséhez

---

## npm - a beépített csomagkezelő

- Segítségével modulokat kezelhetünk: telepíthetünk, frissíthetünk, törölhetünk, publikálhatunk
- Több mint 140 ezer modul közül választhatunk (5 éve még csak 300-ból)
- A Node.js-ba beépítve érkezik

--- 

## Feladat - Egy egyszerű blog motor megvalósítása.

- Bejegyzések létrehozása
- Bejegyzések módosítása
- Bejegyzések listázása
- A felületet angolul hozzuk létre, de legyen lehetőség azt lefordítani

--- 

## Előkészületek

- Létrehozunk egy könyvtárat a projektnek
- Inicializáljuk a projektet
- Telepítjük a szükséges modulokat

```cmd
$ mkdir blog && cd blog && npm init --yes
$ npm install express express-handlebars sqlite3 generic-pool i18n body-parser cookie-parser --save
```

---

## Telepített modulok
- `express` - webszerver keretrenszer
- `express-handlebars` - sablonkezelés Handlebars alapon
- `body-parser` - HTTP üzenetek törzsének feldolgozásához
- `cookie-parser` - süti információk feldolgozásához
- `sqlite3` - adatbázis
- `generic-pool` - *Object pool pattern* egy megvalósítása
- `i18n` - "nemzetköziesítés"

---

### `express`

Az `express` egy általános célú keretrendszer HTTP alkalmazások fejlesztéséhez.

- beépülőkkel (*middleware*) bővíthető, ezek egymásra épülnek
- beépített útvonalkezelés (*routing*)
- a kimenet renderelése szabadon választott sablonozóval (*template engine*)

A fenti programhoz használt beépülők: `body-parser`, `cookie-parser`, `express-handlebars`.

---

### `express-handlebars`

Az `express-handlebars` a **Handlebars** sablonozó motor integrációja az `express` keretrendszerrel.
Alapvetően bármilyen tartalmat kiír, változókat és logikát `{{` és `}}` között adhatunk meg:
```html
{{> entry/entry}}
<form method="post" action="/entries">
	<a href="/entries/{{nid}}/edit">{{t "Edit"}}</a>
	<input name="nid" value="{{nid}}" type="hidden" />
	<input type="submit" name="op" value="{{t "Delete"}}"/>
</form>
```
---

## Modulok

- Az alkalmazásunkat érdemes kisebb modulokra felbontani.
- Egy modulnak ha lehet, egyetlen feladata legyen
- Egy modul használhat további modulokat (`require`)

---

## Modulok

Alkalmazásunkhoz 3 modult hoztam létre:
- `db-pool` - adatbázis kapcsolat (`sqlite3` használatával), valamint a szükséges adatbázisműveletek és integráció `express`-szel
- `engine` - a renderelőmotor (`express-handlebars`) bekonfigurálásához
- `routes` - az egyes útvonalak kezeléséhez

---

### `db-pool`

- az SQLite nem (feltétlen) szálbiztos
- Node.js egy szálon fut, de több folyamat várakozhat I/O műveletre (pl. adatbázisba írás)
- egyszerre csak egy szál írjon / olvasson

---

#### Adatbázis kapcsolat
```javascript
var sqlite = require('sqlite3');

var dbPool = require('generic-pool').Pool({
    name: 'SQLite Pool',
    create: function (callback) {
        var db = new sqlite.Database('blog.db', function (err) {
            callback(err, db);
        });
    },
    destroy: function (db) {
        db.close(function (error) {
            if (error) throw error;
        });
    },
    max: 1,
    min: 1
});
```

---

#### Alapvető lekérdezések

```javascript
dbPool.operations = {
    findAll: function findAll(callback) {
        dbPool.acquire(function (err, db) {
            db.all(
                'SELECT * FROM entries',
                function (error, rows) {
                    dbPool.release(db);
                    callback(error, (!error && rows) || []);
                }
            );
        });
    },
    create: function create(attr, callback) {/* ... */},
    update: function update(attr, callback) {/* ... */},
    load: function load(nid, callback) {/* ... */},
    destroy: function destroy(nid, callback) {/* ... */}
};
```

---

#### Integráció `express`-szel

```javascript
dbPool.init = function (request, response, next) {
    request.db = dbPool.operations;
    next();
}
```

---

### `routes` modul

- `express` beépülő
- külön megadhatunk kezelőt az egyes HTTP műveletekhez (`GET`, `POST`, `DELETE`, `PUT` stb.)
- megadott útvonalakat kezel
  - `/` - listázza az összes bejegyzést
  - `/entries/[nid]` - megmutatja a [nid] azonosítóval rendelkező bejegyzést, illetve `POST` kérés esetén módosítja, vagy törli
  - `/entries/[nid]/edit` - szerkesztési űrlap a bejegyzéshez
  - `/entries` - szerkesztési űrlap új bejegyzéshez
- amennyiben az útvonalat több kezelő is el tudna látni, ez első látja el elsőnek, ami továbbadhatja a vezérlést a következőnek 

---

#### Útvonalkezelő

```javascript
router.get('/', function(request, response, next) {
    request.db.findAll(function (err, entries) {
        response.render('index', {entries: entries});        
    });
});
```

---

## Az alkalmazás összerakása

Behívjuk a szükséges modulokat:
```javascript
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var dbPool = require('./db-pool');
var routes = require('./routes');
var engine = require('./engine');
var app = express();
```

---

#### Bekötjük a modulokat az alkalmazásba

```javascript
app.engine('handlebars', engine.engine);
app.set('view engine', 'handlebars');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join('.', 'public')));
app.use(engine.init);
app.use(dbPool.init);
app.use('/', routes);

app.listen(3000);
```
