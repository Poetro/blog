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

dbPool.acquire(function (err, db) {
    db.run(
            'CREATE TABLE IF NOT EXISTS entries (' +
            'nid INTEGER PRIMARY KEY ASC,' +
            'title TEXT,' +
            'created INTEGER,' +
            'updated INTEGER,' +
            'body TEXT' +
            ')',
        function (error) {
            dbPool.release(db);
            if (error) {
                throw error;
            }
        }
    );
});
dbPool.operations = {
    findAll: function findAll(callback) {
        dbPool.acquire(function (err, db) {
            db.all(
                'SELECT * FROM entries',
                function (error, rows) {
                    dbPool.release(db);
                    callback && callback(error,
                        (!rows || !rows.length) ? null : rows);
                }
            );
        });
    },
    create: function create(attr, callback) {
        dbPool.acquire(function (err, db) {
            db.run(
                    'INSERT INTO entries ' +
                    '(title, created, updated, body) VALUES' +
                    '($title, $created, $updated, $body)',
                {
                    $title: attr.title,
                    $created: attr.created || Date.now() / 1000 | 0,
                    $updated: Date.now() / 1000 | 0,
                    $body: attr.body
                },
                function (error) {
                    dbPool.release(db);
                    callback && callback(error, this.lastID);
                }
            );
        });
    },
    
    update: function update(attr, callback) {
        dbPool.acquire(function (err, db) {
            db.run(
                    'UPDATE entries ' +
                    'SET title=$title, body=$body, updated=$updated ' +
                    'WHERE nid=$nid',
                {
                    $nid: +attr.nid || undefined,
                    $title: attr.title,
                    $updated: Date.now() / 1000 | 0,
                    $body: attr.body
                },
                function (error, rows) {
                    dbPool.release(db);
                    callback && callback(error, rows);
                }
            );
        });
    },
    
    load: function load(nid, callback) {
        dbPool.acquire(function (err, db) {
            db.get(
                'SELECT * FROM entries WHERE nid = ?', [+nid],
                function (error, row) {
                    dbPool.release(db);
                    callback && callback(error, row);
                }
            );
        });
    },
    
    destroy: function destroy(nid, callback) {
        dbPool.acquire(function (err, db) {
            db.all(
                'DELETE FROM entries WHERE nid = ?', [+nid],
                function (error, rows) {
                    dbPool.release(db);
                    callback && callback(error, rows);
                }
            );
        });
    }
};
dbPool.init = function (request, response, next) {
    request.db = dbPool.operations;
    next();
}
module.exports = dbPool;