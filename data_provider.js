var parsers = require('./parser.js');
var grabber = require('./grabber.js');
var Promise = require('./promise.js');

var finish = function(err, callback, promise, data) {
    var e = typeof err === 'string' ? {message: err} : err;
    if (e) {
        callback(e);
    } else {
        callback(null, data);
    }
    if (promise) {
        promise.resolve();
    }
}

var data_provider = function() {
    var that = this;
    that.parsers = {};

    for (var name in parsers) {
        var parser = new parsers[name];
        parser.types.forEach(function(a){
            that.parsers[a] = {
                parser: parser,
                cache: []
            }
        });
    }
};

data_provider.prototype = {
    pop: function(type, callback) {
        var that = this;
        var parser = this.parsers[type] && this.parsers[type].parser;
        if (!parser) {
            return finish('no parser for type ' + parser, callback);
        }
        var cache = this.parsers[type].cache;
        var promise = new Promise();

        if (cache.length) {
            finish(null, callback, promise, cache.shift());
        } else {
            grabber(parser.config(), function(err, data){
                if (err) {
                    return finish(err, callback, promise);
                }

                parser.handle(data, function(err, data){
                    if (err) {
                        return finish(err, callback, promise);
                    }
                    var result;

                    data.forEach(function(item){
                        for (var i in item) {
                            if (!result && i === type) {
                                result = item[i];
                            } else if (i in that.parsers) {
                                that.parsers[i].cache.push(item[i]);
                            }
                        }
                    });

                    if (result) {
                        return finish(null, callback, promise, result);
                    } else {
                        return finish("can't get item of " + type, callback, promise);
                    }
                });
            });
        }

        return promise;
    }
};

module.exports = data_provider;
