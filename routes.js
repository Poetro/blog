var express = require('express');
var router = express.Router();
    
router.get('/', function(request, response, next) {
    request.db.findAll(function (err, entries) {
        response.render('index', {entries: entries});        
    });
});
router.get(/^\/entries\/(\d+)\/edit\/?/, function (request, response) {
    var entryId = request.params[0];
    request.db.load(+entryId, function (error, row) {
        if (!row) {
            var message = response.__('Entry {{entryId}} does not exist', {entryId : entryId});
            response.status(404).render('error', {'message' : message});
        }
        else {
            response.render('form-entry', row);
        }
    });
});
router.get(/^\/entries\/(\d+)\/?/, function (request, response) {
    var entryId = request.params[0];
    request.db.load(+entryId, function (error, row) {
        if (!row) {
            var message = response.__('Entry {{entryId}} does not exist', {entryId : entryId});
            response.status(404).render('error', {'message' : message});
        }
        else {
            response.render('entry', row);
        }
    });
});
router.get(/^\/entries\/?/, function (request, response) {
    response.render('form-entry', {title: '', body: '', created: '', updated: '', nid: ''});
});
router.post(/^\/entries\/(\d+)\/?/, function (request, response) {
    var body = request.body;
    var entryId = request.params[0];
    if (body.op && body.op === response.__('Delete')) {
        request.db.destroy(entryId, function (err) { 
            if (err) {
                response.status(500).render('error', {'message' : err.toString()});
            } else {
                response.redirect('/' + entryId); 
            } 
        });
    }
    else {
        body.nid = entryId;
        request.db.update(body, function (err) {
            if (err) {
                response.status(500).render('error', {'message' : err.toString()});
            } else {
                response.redirect('/entries/' + entryId); 
            }
        });
    }
}); 
router.post(/^\/entries\/?/, function (request, response) {
    var body = request.body;
    if (body.nid && body.op && body.op === response.__('Delete')) {
        request.db.destroy(body.nid, function () { response.redirect('/'); });
    }
    else {
        request.db.create(body, function (err, nid) { 
            if (err) {
                response.status(500).render('error', {'message' : err.toString()});
            } else {
                response.redirect('/entries/' + (nid || ''));
            }
        });
    }
}); 

module.exports = router;