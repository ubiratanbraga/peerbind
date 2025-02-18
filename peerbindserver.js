
<!-- saved from url=(0037)http://peerbind.com/peerbindserver.js -->
<html class=" chrome" minus_screen_capture_injected="true"><head><meta http-equiv="Content-Type" content="text/html; charset=ISO-8859-1"></head><body>//
//    Copyright 2011 Amazon.com, Inc. or its affiliates. All Rights Reserved.
//
//    Licensed under the Amazon Software License (the "License"). You may 
//    not use this file except in compliance with the License. A copy of 
//    the License is located at
//
//    http://aws.amazon.com/asl/
//
//    or in the license file accompanying this file. This file is 
//    distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS 
//    OF ANY KIND, express or implied. See the License for the specific 
//    language governing permissions and limitations under the License. 

var util = require("util");
var fs = require('fs');
var http = require('http');
var url = require('url');
var querystring = require('querystring');
var events = require('events');

var htmlFiles = [];

var blacklist = {};

fs.readdir('/home/ec2-user/node-bin/html/', function (err, files) {
    if (err) return;
    files.forEach( function (file) {
        fs.stat('/home/ec2-user/node-bin/html/' + file, function (err, stats) {
                if (err) throw err;
                if (stats.isFile()) {
                    console.log("%s is file", file);
                    fs.readFile('/home/ec2-user/node-bin/html/'+file,function (err, data) {
                        if (err) throw err;
                        htmlFiles[file] = data;
                    });
                }
                else if (stats.isDirectory ()) {
                    console.log("%s is a directory", file);
                }
               console.log('stats: %s',JSON.stringify(stats));
        });
    });
});

function Instance(instance, queue, peersetPrefix) {
    this.alive = true;
    this.stats = instance;
    this.dns = instance.dnsName;
    this.privatedns = instance.privateDnsName;
    this.queues = queue;
    this.prefix = peersetPrefix
    this.isRedirect = true;
    this.accessTime = new Date().getTime();
}

Instance.prototype.isAlive = function(val) {
    if ( val !== undefined )
        this.alive = val;
    return this.alive;
}

//Index to queues by index name
var queues = {};
var prefixIndex = {};

//The total collection of machines created.
var instances = [];

//The folks using a peersetPrefix that are waiting for a host.
var instanceWait = {};

//Machines that are ready to take the load if this one is overheated.
var instancePool = [];

//A queues
function Queue() {
    this.id = "";
    this.messages = [];
    this.accessTime = new Date().getTime();

    this.inPool = false;
    this.poolId = -1;

    events.EventEmitter.call(this);
    this.setMaxListeners(0);
}
util.inherits(Queue, events.EventEmitter);

Queue.prototype.addMessage = function(msg) {
    if (typeof msg == 'object' &amp;&amp; msg.length) { // msg is an array
        for (var i=0; i<msg.length; i++)="" {="" var="" submsg="msg[i];" if="" (typeof="" 'object')="" }="" this.messages.push(submsg);="" else="" msg="=" this.messages.push(msg);="" this.emit("msgadded",="" this.id);="" queue.prototype.clearmessages="function()" this.accesstime="new" date().gettime();="" clear="" the="" messages="" queue.="" this.messages="[];" console.log("messages="" cleared:="" \t"+this.id);="" queue.prototype.getmessages="function(callback)" return="" a="" copy="" of="" array.="" msgs="this.messages;" checked:="" \t"+this.id="" +"\t="" ct:="" "="" +="" msgs.length);="" callback(msgs);="" function="" getpeerset(prefix,="" guid)="" prefix="" "-"="" guid;="" getpeersetprefix(type,="" urlstring,="" data)="" peerset="nurffle" ;="" switch(type)="" case="" "domain":="" break;="" "page":="" "ip":="" data="" *the="" ip*="" );="" "geo":="" lat="" long*="" "string":="" string*="" peerset;="" getpeersetdomain(urlstring)="" try="" fullpath="url.parse(urlString).host;" fullpath;="" catch(ex)="" console.log("exception:="" ");="" console.log(ex);="" getpeersetip(urlstring,="" ip)="" urlobj="url.parse(urlString);" (urlobj.pathname="" ?="" urlobj.pathname="" :="" "")="" ip;="" getpeersetpage(urlstring)="" "");="" getpeersetgeo(urlstring,="" latdata)="" latnlong="latData.split(/,/);" *="" 100);="" lng="Math.round(parseFloat(latNLong[1])" lng;="" getpeersetstring(url,="" strval)="" strval;="" catch="" (ex)="" takepeerset(req,="" res,="" reqobj)="" (req.method="=" 'post')="" console.log("handling="" take="" queue="" with="" post.");="" body="" req.on('data',="" (data)="" });="" req.on('end',="" ()="" this="" is="" big="" data.="" pull="" peerset.="" reqobjpost="querystring.parse(body);" peersetprefix="reqObjPost.pp;" qs="JSON.parse(reqObjPost.qs);" (="" prefixindex[peersetprefix]="=" null="" )="" for="" index="" in="" curq="qs[index];" q="new" queue();="" q.id="curq.id;" q.messages="curq.messages;" queues[q.id]="=" queues[q.id].messages.concat(q.messages);="" prefixindex[peersetprefix].push(queues[q.id]);="" res.end("got="" it!");="" launchinstance(peersetprefix,="" peerset,="" callback)="" console.log("ack!="" failed="" to="" start="" host:="" will="" be="" called="" remove="" pointer="" other="" machine="" from="" our="" index(so="" we="" don't="" direct="" customers="" there.="" removeinstance(peersetprefix)="" instances[peersetprefix].isalive(false);="" instancepool.length=""> 3 ) {
        //Shut down this machine.
    }
    else
        //Other wise keep it for another overrun
        instancePool[instancePool.length] = instances[peersetPrefix];

    delete prefixIndex[peersetPrefix];
    delete instances[peersetPrefix];
}

//When a new client comes in, we'll check to see if the host is around before 
//assigning the host to the caller.
function checkInstanceHealth(peersetPrefix, peerset, callback) {
    callback(peersetPrefix, peerset, instances[peersetPrefix].isAlive());
}

function transferMsgs(peersetPrefix, callback) {
    //Send the messages as a post to the instance in the instance struct. 
    console.log("Starting msg transfer to : " + peersetPrefix + " on: " + prefixIndex[peersetPrefix].privatedns);

    var options = {
        host: prefixIndex[peersetPrefix].dns,
        port: 80,
        path: '/takequeue/',
        method: 'POST'
    };

    console.log("Starting msg transfer to : " + peersetPrefix + " on: " + options.host);

    try {
        console.log("Starting request setup.");
        var request = http.request(options, function(res,error) {
                res.setEncoding('utf8');
                console.log('STATUS: ' + res.statusCode);
                res.on('data', function(chunk) {
                    console.log("DATA: " + chunk);
                });
                callback();
        }); 

        request.on('error', function(e) {
            setTimeout((function(peersetPrefix, callback) {
                return (function() {
                    transferMsgs(peersetPrefix, callback);
                });
            })(peersetPrefix, callback),5000);
            return;
        });

        var data = "pp="+peersetPrefix+"&amp;qs="+JSON.stringify(prefixIndex[peersetPrefix].queues);
        console.log("Writting data:" + data);
        request.write(data);
        console.log("Signaling go!");
        request.end();

    } catch (ex) {
        console.log("Exception trying to sync messages.");
        console.log(request);
        console.log(ex);
    }   

}

function handOffPeerset(peersetPrefix, peerset, res, callback) {
    //Setup waiting queue
    if ( !instanceWait[peerset] ) {
        instanceWait[peerset] = [];

        //The response object waiting on this response.
        instanceWait[peerset].push(callback);
    
        //Start instance 
        //Serilialize set
        //Set DNS entry
        //Force client registration 
        //Record host for peerset.
        //Drain waiting queue
        launchInstance(peersetPrefix, peerset, (function(callback, peersetPrefix, peerset) {
                                                    return (function() {
                                                                transferMsgs(peersetPrefix, function() {
                                                                    console.log("Done transferring msgs to secondary host.");
                                                                    for ( var i = 0; i &lt; instanceWait[peerset].length; i++ ) {
                                                                        instanceWait[peerset][i]();
                                                                    }
                                                                    delete instanceWait.peerset;
                                                                    console.log(prefixIndex);
                                                                });
                                                    });
                                               })(callback,peersetPrefix,peerset));
    }
    else {
        //The response object waiting on this response.
        instanceWait[peerset].push(callback);
    }

}

function redirectToMachine(prefix, peerset, req, res, reqObj, dontClose) {
    try {
        prefixIndex[prefix].accessTime = new Date().getTime();
        console.log("Writting out redirection code.");
        res.write("$.fn.peerbind.defaults.endpoint='"+prefixIndex[prefix].dns+"';\n");
        res.write("$.fn.peerbind.defaults.endpointprefixes=[];\n");
    } catch (ex) {
        console.log(ex);
    }
}

function canHandleNewPrefix() {
    return true;
}

function handleRegistration(req, res, reqObj, dontClose) {
    try {
        var referer = req.headers.referer;
        if ( reqObj.query.u )
            referer = reqObj.query.u;

        if ( !referer || referer == undefined ) {
            res.end("No referer.");
            return;
        }

        var callback = reqObj.query.f;
        var guid = reqObj.query.g;
        var type = reqObj.query.t;
        var data = reqObj.query.d;

        var peersetPrefix = getPeersetPrefix(type, referer, data);
        var peerset = getPeerset(peersetPrefix, guid); 

        if ( queues[peerset] == null &amp;&amp; (prefixIndex[peersetPrefix] == null || prefixIndex[peersetPrefix]["isRedirect"] == null)) {
            queues[peerset] = new Queue();
            queues[peerset].id = peerset;

            if ( prefixIndex[peersetPrefix] == null )
                prefixIndex[peersetPrefix] = [];  

            var indexArray = prefixIndex[peersetPrefix];
            indexArray[indexArray.length] = queues[peerset];
            if ( !canHandleNewPrefix() ) {
                console.log("Handing off peersetPrefix:" + peersetPrefix);
                handOffPeerset(peersetPrefix, peerset, res, (function(peersetPrefix, peerset, req, res, reqObj, dontClose) {
                    return (function() {
                        console.log("Done handing off peersetPrefix:" + peersetPrefix);
                        redirectToMachine(peersetPrefix,peerset,req,res,reqObj,dontClose);
                        res.write(callback+"('["+guid+"]','"+peersetPrefix+"','"+peerset+"');");
                        res.end();
                        console.log("Callback sent.");
                    });
                })(peersetPrefix,peerset,req,res,reqObj,dontClose));
                return;
            }
        }
        else if ( prefixIndex[peersetPrefix] != null &amp;&amp; prefixIndex[peersetPrefix]["isRedirect"] ) {
            redirectToMachine(peersetPrefix,peerset,req,res,reqObj,dontClose);
        }
        else 
            queues[peerset].clearMessages();//clears the queue and resets access time.

        if ( !dontClose )
            res.end(callback+"('["+guid+"]','"+peersetPrefix+"','"+peerset+"');");
    } catch(ex) {
        console.log("Exception: ");
        console.log(ex);
    }
}

function cleanInput(data) {
    if ( data )
        data = data.replace(/\&lt;|\&gt;|\(|\)/g,"").replace(/"/g,'\\"').replace(/'/g,"\\'");
    return data;
}

function handlePost(req, res, reqObj) {
    try {
        var referer = req.headers.referer;
        if ( reqObj.query.u )
            referer = reqObj.query.u;

        var callback = cleanInput(reqObj.query.f);
        var guid = cleanInput(reqObj.query.g);
        var type = cleanInput(reqObj.query.t);
        
        var eventObj = {};
        try {
            eventObj = JSON.parse(reqObj.query.e);
            if (eventObj.length) {
                // if it is an array, visit each entry separately
                for (var i=0; i<eventobj.length; i++)="" {="" eventobj[i].s="eventObj[i].s.replace(/&lt;|">/g,"");
                    eventObj[i].t = cleanInput(eventObj[i].t);
                }
            } else {
                eventObj.s = eventObj.s.replace(/&lt;|&gt;/g,"");
                eventObj.t = cleanInput(eventObj.t);
            }
        }
        catch (eventException) {
            res.end(callback+'([],0);');
            console.log("Exception: ");
            console.log(eventException);
            return;
        }

        var data = cleanInput(reqObj.query.d);
        var target = cleanInput(reqObj.query.q);
        console.log("Guid adding: " + guid);
        if ( blacklist[guid] ) {
            console.log("Guid blocked: " + guid);
            return;
        }

        var peersetPrefix = getPeersetPrefix(type, referer, data);
        var peerset = getPeerset(peersetPrefix, guid); 

        //This is not a targeted event.
        if ( !target ) {
            for ( var q in prefixIndex[peersetPrefix] ) {
                var curQ = prefixIndex[peersetPrefix][q];
                if ( curQ &amp;&amp; curQ.id != peerset ) {
                    curQ.addMessage(eventObj);
                }
            }
        }
        //Targeted event.  They have someone in mind.
        else {
            var targetPeerset = getPeerset(peersetPrefix, target); 
            if ( queues[targetPeerset] )
                queues[targetPeerset].addMessage(eventObj); 
        }

        //$.fn.peerbind.peerbindPost1([{"src":"3154510-6734933-7399065","s":"body:eq(0)","t":"arrived","d":"","o":"1297363099141"}],0);
        res.end(callback+'(['+JSON.stringify(eventObj)+'],0);');
    } catch(ex) {
        console.log("Exception: ");
        console.log(ex);
        try {
            res.end();
        } catch (e) {
        }
    }
}

function respondWithMsgs(peerset, res, callback) {
    var responded = false;
    try
    {
        if ( !queues[peerset] ) {
            res.end("No queue.Re-register.");
            return;
        }
        if ( res.socket.writable ) {
            queues[peerset].getMessages(function(msgs) {
                //jQuery.fn.peerbind.peerbindTrigger([{"src":"5824815-4029276-6442589","s":"#chatinput","t":"change","d":"f","o":"1297367135634"},{"src":"5824815-4029276-6442589","s":"#chatinput","t":"change","d":"f","o":"1297367134237"},{"src":"5824815-4029276-6442589","s":"#chatinput","t":"change","d":"f","o":"1297367134373"}],0);jQuery.fn.peerbind.peerbindTrigger([],0);
                if ( msgs.length ) {
                    try {
                        res.write(callback+'(['+msgs.join(",")+'],0);');
                    } catch (e) {
                        console.log("EXCEPTION:", e);
                        throw (e)
                    }
                    res.end();
                    //No reason to let these fire.
                    clearTimeout(res.connTimer);
                    responded = true;
                }
                else {
                    //console.log("Nothing to send:" + peerset);
                }
            });
        }
    }
    catch(ex)
    {
        console.log("EXCEPTION: %s", ex);
    }

    return responded;
}

function handlePoll(req, res, reqObj) {
    try {
        var referer = req.headers.referer;
        if ( reqObj.query.u )
            referer = reqObj.query.u;

        var callback = reqObj.query.f;
        var guid = reqObj.query.g;
        var type = reqObj.query.t;
        var data = reqObj.query.d;

        var peersetPrefix = getPeersetPrefix(type, referer, data);
        var peerset = getPeerset(peersetPrefix, guid); 

        var myQ = queues[peerset];
        if ( myQ == null ) {
            //Whoops..  Someone is polling on a queue that does'nt live.
            handleRegistration(req, res, reqObj, true /*means it shouldn't respond.*/);
        }

        conditionResponseObject(res, peerset, callback);
    } catch(ex) {
        console.log("Exception polling: " + util.inspect(ex));
    }
}

function conditionResponseObject(res, peerset, callback) {
    try {
        var meTimestamp = new Date().getTime();
        res.scopedResponse = function(peerset) {
            if ( respondWithMsgs(peerset, res, callback) ) {
                //console.log("Removed responder: " + peerset);
                queues[peerset].removeListener("msgadded", res.scopedResponse);
            }
            else {
                //console.log("No messages sent: " +peerset);
            }
        }

        res.scopedListener = function(time) {
            if ( meTimestamp &lt; time ) {
                //console.log("Removed listener - ended call.");
                queues[peerset].removeListener("msgadded", res.scopedResponse);
                res.end(callback+'([],0);');
            } 
        }

        //console.log("\nPolling for:" + peerset);
        if ( queues[peerset] ) {
            queues[peerset].removeAllListeners("msgadded");
            queues[peerset].on("msgadded", res.scopedResponse);

            //Call it once to see if there are 
            //any messages already waiting.
            res.scopedResponse(peerset);
        }
        else {
            res.end();
            return;
        }

        //After 30 seconds, close the connection.
        res.connTimer = setTimeout((function(res, peerset) {
            return (function() {
                queues[peerset].removeListener("msgadded", res.scopedResponse);
                res.end(callback+'([],0);');
            });
        })(res, peerset), 30000);
        res.on("end", function() {
            queues[peerset].removeListener("msgadded", res.scopedResponse);
        });

    } catch(ex) {
        console.log("Exception condtioning response: " + util.inspect(ex));
    }
}

//If the queues are older than a day, get rid of them.
function cleanQueues() {
    for ( var q in queues ) {
        if ( queues[q] ) {
            var time = queues[q].accessTime;

            //Check to see if the age is greater than a 90 seconds
            if ((new Date().getTime()) - time &gt; (90000 * 1)) {
                console.log("Removing q: "+ q);
                delete queues[q];
            }
        }
    }
}

function cleanInstances() {
    for ( var instance in instances ) {
        if ( instances[instance] ) {
            var time = instances[instance].accessTime;

            //Check to see if the age is greater than a day
            if ((new Date().getTime()) - time &gt; (86400 * 1)) {
                console.log("Removing instance: "+ instance);
                removeInstance(instance);
            }
        }
    }
}

//Clean the queues every 30 seconds;
setInterval(cleanQueues, 1000 * 30);

//Clean up instances every 1 hour.
setInterval(cleanInstances, 1000 * 60 * 60);

function requestHandler(req, res) {
    try {
        res.writeHead(200, {'Content-Type': 'text/javascript'});
        var reqObj = url.parse(req.url,true);
        var fileName = reqObj.pathname;
        if ( fileName )
            fileName = fileName.replace(/\//,"").replace(/\/.*/,"");

        if ( !fileName || fileName == "" )
            fileName = "index.html";

        var headerObj = req.headers;

        var path = reqObj.pathname

        if ( path == "/register/" )
            handleRegistration(req, res, reqObj, false);
        else if ( path == "/post/" )
            handlePost(req, res, reqObj);
        else if ( path == "/poll/" ) {
            handlePoll(req, res, reqObj);
        }
        else if ( path == "/takequeue/" ) {
            console.log("Handling take queue.");
            takePeerset(req,res, reqObj);
        }
        else
        {
            if ( htmlFiles[fileName] )
            {
                if ( res.socket &amp;&amp; res.socket.writable )
                {
                    if ( fileName.match(/\.js$/) )
                        res.writeHead(200, {'Content-Type': 'text/javascript'});
                    if ( fileName.match(/\.ico$/) )
                        res.writeHead(200, {'Content-Type': 'image/png'});
                    else
                        res.writeHead(200, {'Content-Type': 'text/html'});
                    res.end(htmlFiles[fileName]);
                }
            }
            else
            {
                if ( res.socket &amp;&amp; res.socket.writable )
                {
                  res.writeHead(200, {'Content-Type': 'text/plain'});
                  res.end('(function() { console.log("oops: ' + fileName +'");})()');
                }
            }
        }
    } catch(ex) {
        console.log("Exception: ");
        console.log(ex);
    }
}

http.createServer(requestHandler).listen(7337);
http.createServer(requestHandler).listen(8080);
http.createServer(requestHandler).listen(80);
</eventobj.length;></msg.length;></body></html>