var expressHandlebars = require('express-handlebars');
var i18n = require('i18n');

i18n.configure({
  locales: ['en', 'hu'],
  cookie: 'locale',
  directory: "" + __dirname + "/locales"
});

var handlebars = expressHandlebars.create({
    helpers: {
        t: function() {
            return i18n.__.apply(this, arguments)
        },
        n: function() {
            return i18n.__n.apply(this, arguments)
        },
        formatDate: function(date) {
            return new Date(date * 1000).toISOString()
        }     
    },
    defaultLayout: 'main'
});

module.exports = {
    engine: handlebars.engine,
    init: i18n.init.bind(i18n)
};