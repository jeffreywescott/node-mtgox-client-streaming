var mtgox = require('./mtgox');

var API_KEY = undefined;
var API_SECRET = undefined;

var mtGox = new mtgox.MtGox(API_KEY, API_SECRET);
mtGox.unsubscribe('trade');
mtGox.unsubscribe('depth');
//mtGox.unsubscribe('ticker');

mtGox.onMessage(function(data) {
  console.log(data);
});

if (API_KEY && API_SECRET) {
  mtGox.authEmit({
    call: 'private/info'
  });
}
