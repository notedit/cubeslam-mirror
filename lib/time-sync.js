var Emitter = require('emitter')
  , debug = require('debug')('time-sync');

/**
  This lib assumes that a PeerConnection has been
  set up between two clients. 

  It works by using `DataChannel#send` to send a series
  of sync requests (of which the local time has been stored)
  and listening for sync replies and then calculates a
  latency based on median-stddev.

  Based on http://www.gamedev.net/page/resources/_/technical/multiplayer-and-network-programming/clock-synchronization-of-client-programs-r2493

    // uses DataChannel to synchronize the time
    // of 2 clients, very useful for a realtime
    // multiplayer game like "chrome pong"
    var TimeSync = require('time-sync')
      , sync = new TimeSync(dataChannel);

    // will be called for both host and guest when 
    // the total latency has been calculated
    sync.on('complete',function(){
      // now set game clock to 0 + this.latency
    }).start()
*/

module.exports = TimeSync;

var REQUEST = 'TSQ';
var REPLY = 'TSR';
var DONE = 'TSD';

function TimeSync(dataChannel){
  if( !(this instanceof TimeSync) )
    return new TimeSync(dataChannel);
  if( !dataChannel )
    throw new Error('data channel required');
  this.dataChannel = dataChannel;
  this.times = [];
  this.index = 0;
  this.wanted = 40;
  this.requestTimes = {};

  this._onmessage = this.dataChannel.onmessage;
  this.dataChannel.onmessage = this.onmessage.bind(this);

  Emitter.call(this)
}
Emitter(TimeSync.prototype);

TimeSync.prototype.onmessage = function(e){
  var msg = e.data;

  // check for REQUEST
  if( msg.indexOf(REQUEST) == 0 ){
    var index = msg.slice(REQUEST.length)
    this.dataChannel.send(REPLY+index)
    debug('got REQUEST',index)
    debug('sent REPLY',index)
    this.emit('request',index)

  // check for REPLY
  } else if( msg.indexOf(REPLY) == 0 ){
    var index = msg.slice(REPLY.length)

    // we good, it's one of ours
    var requestTime = this.requestTimes[index]
    if( this.requesting && requestTime ){
      var replyTime = Date.now()
      this.times.push([requestTime,replyTime])
      delete this.requestTimes[index]
      debug('got REPLY',index)
      this.emit('reply',index)
    } else {
      console.warn('unexpected REPLY',index)
    }

  // check for DONE
  } else if( msg.indexOf(DONE) == 0 ){
    if( !this.requesting ){
      this.latency = parseFloat(msg.slice(DONE.length))
      debug('got DONE',this.latency)
      this.emit('done',false)
    } else {
      console.warn('unexpected DONE')
    }

  // or send it away to any previous callbacks
  } else if( typeof this._onmessage == 'function' ){
    this._onmessage.apply(this,arguments)

  }
}

TimeSync.prototype.start = function(sendRequests){
  if( this.requesting )
    throw new Error('already started');

  debug('start',sendRequests);

  if( !sendRequests )
    return;

  this.requesting = true
  this.times.length = 0 // clear array
  this.index = Math.round(Math.random()*10000)

  // send a request every 20ms until we have received
  // enough replies.
  this.interval = setInterval(function(){
    // if we have enough request/replies we're done
    if( this.requesting && this.times.length >= this.wanted ){
      this.done()

    // or we keep sending requests 
    } else if( this.requesting ){
      this.request()

    // or stop it
    } else {
      clearInterval(this.interval)
      clearTimeout(this.timeout)
    }
  }.bind(this),30)

  this.timeout = setTimeout(function(){
    debug('timed out')
    clearInterval(this.interval)
    clearTimeout(this.timeout)
    this.requesting = false
    this.emit('timeout')
  }.bind(this),10000)

  // TODO how can we make sure the first request is received?
  // if we don't get an ACK on the first request we can't know
  // if we should expect replies or keep sending requests, right?

  // Currently we use `sendRequests` which is just a flag based on
  // which peer send the first offer. Another solution would be to
  // also send along a random number and the peer with requests with
  // a higher number "wins" and will be considered the host.

}

TimeSync.prototype.request = function(){
  var requestIndex = ''+this.index
  this.requestTimes[requestIndex] = Date.now()
  this.dataChannel.send(REQUEST+requestIndex)
  debug('sent REQUEST',requestIndex,this.times.length == 0 ? 'initial' : '')
  this.index++
}

TimeSync.prototype.done = function(){
  // cancel the rest of the requests
  clearInterval(this.interval)
  clearTimeout(this.timeout)
  this.requesting = false
  this.calculateLatency()
  this.dataChannel.send(DONE+this.latency)
  debug('sent DONE',this.latency)
  this.emit('done',true)
}

TimeSync.prototype.calculateLatency = function(){
  // create an array of "midway-latencies"
  var x = this.times.map(function(times){
    return (times[1] - times[0])/2;
  })
  var n = x.length;

  debug('x',x.join(', '))

  // sort them to get the median value
  x.sort(function(a,b){ return a - b; })
  var median = n % 2 == 0
    ? x[n/2]
    : (x[Math.floor(n/2)] + x[Math.floor(n/2)+1])/2;
  var mean = x.reduce(sum,0) / n;

  // compute standard deviation
  var xsquared = x.reduce(squared,0)
  var xsum = x.reduce(sum,0);
  // s² = ( ∑x² - (∑x)²/ n ) / n – 1 (paper)
  var std = Math.sqrt( (xsquared - (xsum*xsum) / n) / n - 1 );
  // s = sqrt(∑x² / n) (wikipedia)
  // var std = Math.sqrt(xsquared / n);
  var I = x.filter(function(x){
    return Math.abs(median - x) < std;
  })
  this.latency = I.reduce(sum,0) / I.length;

  debug('median',median)
  debug('mean',mean)
  debug('stddev',std)
  debug('I',I.join(', '))
}

function sum(s,x){ return s + x };
function squared(s,x){ return s + x*x };