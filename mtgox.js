var io = require('socket.io-client');
var crypto = require('crypto');

var MtGox = function(apiKey, apiSecret) {
  this.socket = io.connect('https://socketio.mtgox.com/mtgox');
  this.apiKey = apiKey;
  this.apiSecret = apiSecret;
};

MtGox.prototype = {
  CHANNELS: {
    trade: 'dbf1dee9-4f2e-4a08-8cb7-748919a71b21',
    depth: '24e67e0d-1cad-4cc0-9e7a-f8523ef460fe',
    ticker: 'd5f06780-30a8-4a48-a2f8-7ed181b4a13f'
  },

  onMessage: function(func) {
    // Set up the callback for messages coming through the socket.
    this.socket.on('message', func);
  },

  subscribe: function(channelName) {
    this.emit({
      op: 'subscribe', 
      channel: this.CHANNELS[channelName]
    });
  },

  unsubscribe: function(channelName) {
    this.emit({
      op: 'unsubscribe', 
      channel: this.CHANNELS[channelName]
    });
  },

  emit: function(commandObj) {
    // This API expects commandObj to be of the form:
    // {
    //   op: <OPERATION, e.g., 'subscribe'>,
    //   <PARAM NAME 1, e.g., channel>: <PARAM VALUE 1>
    //   <PARAM NAME ..., e.g., channel>: <PARAM VALUE ...>
    //   <PARAM NAME N, e.g., channel>: <PARAM VALUE N>
    // }
    this.socket.emit('message', commandObj);
  },

  authEmit: function(queryObj) {
    // This API will automatically add the 'id' and 'nonce' data to the query object,
    // then will sign the query using your API secret. Then it will create and emit
    // an appropriate command object over the socket.
    //
    // The queryObj is expected to be of the form:
    // {
    //   call: "<MTGOX HTTP API ENDPOINT, e.g. 'private/info'>",
    //   /*** OPTIONAL ***/ params: {<OBJECT CONTAINING PARAMS FOR THE HTTP API ENDPOINT>},
    //   /*** OPTIONAL ***/ item: "<e.g., BTC>",    
    //   /*** OPTIONAL ***/ currency: "<e.g., USD>"
    // }
    // var queryObj = {
    //   id: requestId,
    //   call: 'private/info',
    //   nonce: nonce
    //   // params: {},
    //   // item: 'BTC',
    //   // currency: 'USD'
    // };

    // add id and nonce to the queryObj
    var nonce = this._nonce();
    var requestId = crypto.createHash('md5').update(nonce).digest('hex');
    queryObj.nonce = nonce;
    queryObj.id = requestId;

    // sign the query, prepend a binary representation of our API key, then append the query object as JSON
    var queryJSON = JSON.stringify(queryObj);
    var signedQuery = crypto.createHmac('sha512', new Buffer(this.apiSecret, 'base64')).update(queryJSON).digest('binary');
    var binKey = (new Buffer(this.apiKey.replace(/-/g, ''), 'hex')).toString('binary');
    var call = (new Buffer(binKey + signedQuery + queryJSON, 'binary')).toString('base64');

    // set up and emit our command
    var commandObj = {
      op: 'call',
      id: requestId,
      call: call,
      context: 'mtgox.com'
    };
    this.emit(commandObj);
  },

  //----------------------------------------------------
  // PRIVATE -- these methods subject to change
  //----------------------------------------------------
  _nonce: function() {
    return ((new Date()).getTime() * 1000).toString();
  }

};

exports.MtGox = MtGox;
