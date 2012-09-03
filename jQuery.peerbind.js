//
//    Copyright 2011 Amazon.com, Inc. or its affiliates. All Rights Reserved.
//
//    Licensed under the Amazon Software License (the “License”). You may 
//    not use this file except in compliance with the License. A copy of 
//    the License is located at
//
//    http://aws.amazon.com/asl/
//
//    or in the “license” file accompanying this file. This file is 
//    distributed on an “AS IS” BASIS, WITHOUT WARRANTIES OR CONDITIONS 
//    OF ANY KIND, express or implied. See the License for the specific 
//    language governing permissions and limitations under the License. 

(function($) {
    //This allows you to listen to only one triggering of an event. 
    $.fn.peerone = function(type,data,fn) {
        return this.peerbind(type,data,fn,true);
    };

    /*
        The magic happens here.  This signs up an event for listening, starts 
        the registration, and kicks off polling.
         type: The name of the event type you want to listen in on.
         data: Optional data to get back when the event fires.
         fn: The call back that should happen when it fires.
         isOnce: Listen only once to the fired event.
         
         Note: There is a convienience feature where you can include an 
         object in the data slot for local(fn), peer(fn), and data. Where
         local and peer are handler functions. 
    */
    $.fn.peerbind = function(/*optional settings,*/ type, data, fn, isOnce) {
        //Check to see if there are settings...
        if ( type && jQuery.isPlainObject(type) ) {
            //Yup set them and return.
            $.extend(true, $.fn.peerbind.defaults, type);

            //Move the parameter stack along...
            type = data;
            data = fn;
            fn = isOnce;
            if ( arguments.length == 5 )
                isOnce = arguments[4];
        }

        //Specialized handlers that are called only when events are
        //src'd accordingly.
        var localHandler = null;
        var peerHandler = null;

        $.fn.peerbind.registerDevice(true);

        //Check to see if the parameter mungin is necessary.
        if ( jQuery.isFunction( data ) ) {
            fn = data;
            data = undefined;
        } //Now check to see if they used the conveinience object.
        else if ( data != null && ( data["local"] || data["peer"] || data["data"])) {
            localHandler = data["local"];
            peerHandler = data["peer"];
            data = data["data"];
        }

        var sel = this.selector;
        if ( !sel || sel == "" ) {
            //First find out how many of this tag there are.
            var elem = this[0];
            var elementsOfNode = jQuery((elem.tagName + "").toLowerCase());

            //Try a little harder to find a selector that 
            //will work.
            if ( this[0] == document ) {
                sel = "document";
            }
            else if ( this[0] == window ) {
                sel = "window";
            }
            else {
                var selectorString = "";
                if ( $(elem).attr("id") != null && $(elem).attr("id") != "" ) {
                    sel = "#" + $(elem).attr("id");
                }
                else if ( elementsOfNode.length == 1 ) {
                    sel = (elem.tagName+"").toLowerCase()
                }
                else if ( elem.className && elem.className != "" ) {
                    //Get all of this class and count it.
                    var elementsOfClass = jQuery("."+elem.className);
                    for ( var i = 0; i < elementsOfClass.length; i++ ) {
                        if ( elementsOfClass[i] == elem ) {
                            sel = "."+elem.className+":eq("+i+")";
                            break;
                        }
                    }
                }
                else {
                    //Get all of this type of element and find it
                    // in the list.  We come from the same page
                    //so this should
                    for ( var i = 0; i < elementsOfNode.length; i++ ) {
                        if ( elementsOfNode[i] == elem ) {
                            sel = (elem.tagName+"").toLowerCase()+":eq("+i+")";
                            break;
                        }
                    }
                }
            }
        }

        function postBundleEvents(bundle,sel,srcElem,type) {
            var bundleString = "[";
            for ( var i = 0; i < bundle.length; i++ ) {
                var e = bundle[i];
                //This is the mouse down.
                if ( i == 0 ) { }
                else {
                    bundleString += ",";
                }

                bundleString += '{"x":'+e.x+
                                ',"y":'+e.y+
                                ( e.lx ? ',"lx":'+e.lx+',"ly":'+e.ly : '' ) +
                                ( e.ex ? ',"ex":'+e.ex+',"ey":'+e.ey : '' ) +
                                ',"t":'+e.t+'}';

                //This is the mouse up.
                if ( i == (bundle.length - 1) ) {
                    bundleString += "]";
                    //Finish and post
                    var eventObj = { 
                        type:type,
                        bundleData: bundleString
                    };

                    eventObj.target = eventObj.currentTarget = srcElem;
                    $.fn.peerbind.postPeerEvent(eventObj,sel);
                }
            }
        }

        this.each(function() {
            //Run through each type of event provided.
            var types = type.split(/ /);
            for ( var typeCt = 0; typeCt < types.length; typeCt++ ) {
                var curType = types[typeCt];

                //Mark this is "bound"
                $(this).data("peerbound"+curType,"1");
                if ( curType == "mousebundle" || curType == "mousewatch" ) {
                    var eventBundleWatch = function(e) {
                        var moveEvents = [];
                        var lastTime = 0;

                        moveEvents[moveEvents.length] = { x:    e.pageX, 
                                                          y:    e.pageY,
                                                          lx:   e.pageX - $(this).offset().left, 
                                                          ly:   e.pageY - $(this).offset().top, 
                                                          ex:   $(this).offset().left,
                                                          ey:   $(this).offset().top,
                                                          t:    new Date().getTime()};

                        var moveFunc = (function(moveArray, lastTime) {
                            return (function(e) {
                                if ( new Date().getTime() - lastTime > 50 ) {
                                    lastTime = new Date().getTime();
                                    moveArray[moveArray.length] = { x: e.pageX, y: e.pageY, t: lastTime };
                                }
                            });
                        })(moveEvents, lastTime);

                        $(this).mousemove(moveFunc);

                        $("body").one("mouseup.pbindbundle", (function(moveArray, scope, moveFunc, sel, type) {
                            return (function(e) {
                                $(scope).unbind("mousemove", moveFunc);
                                moveArray[moveArray.length] = { x: e.pageX, y: e.pageY, ex: $(e.target).css("left").replace(/px/,"")-0, ey: $(e.target).css("top").replace(/px/,"")-0, t: new Date().getTime()};
                                                         
                                                          
                                postBundleEvents(moveArray,sel,scope,type);
                            });
                        })(moveEvents, this, moveFunc, sel, curType));
                    }

                    if ( curType == "mousebundle" ) {
                        //This is a special type of event where we bundle up the important
                        //bits.
                        $(this).bind("mousedown.pbindbundle", eventBundleWatch);
                    }
                    else if ( curType == "mousewatch" ) {
                        $(document.body).one("mousemove.pbindbundle",eventBundleWatch);
                        $(document.body).one("mousewatchend.pbindbundle",function() {
                            $(document.body).trigger("mouseup.pbindbundle");
                        });
                    }
                }

                $(this).bind(curType+".pbind", data, (function(scope, fn, sel, isOnce, localHandler, peerHandler) {
                    return (function(event) {
                                // backward compatibility.  Prefered location for value is peerInfo
                                if ( !event.peerData && !event.data && event.type == 'change' ) {
                                    event.peerData = $(event.currentTarget).val();
                                }

                                if ( !event.peerData && event.data && event.data.length ) {
                                    event.peerData = event.data.join(",");
                                }

                                if ( !event.srcPeer ) {
                                    $.fn.peerbind.addPeerInfo(event);
                                    $.fn.peerbind.postPeerEvent(event,sel);
                                }

                                event.currentTarget = scope;

                                if ( isOnce ) {
                                    $(this).unbind(event.type+".pbind", arguments.callee);
                                }

                                var returnVal = null;
                                if ( !event.srcPeer && localHandler ) {
                                    returnVal = localHandler.apply(scope, arguments);
                                }
                                else if ( event.srcPeer && peerHandler ) {
                                    returnVal = peerHandler.apply(scope, arguments);
                                }
                                
                                if ( fn )
                                    returnVal = fn.apply(scope,arguments);

                                return returnVal;
                           });
                })(this, fn, sel, isOnce, localHandler, peerHandler));
                
            }
        });

        return this;
    };
    
    $.fn.peerbundle = function(options) {
        $.fn.peerbind.registerDevice(true);

        var settings = $.extend(false,{
            startEvent:"",      // event that starts the bundle
            startSel: this,     // selector for the startEvent (default: selector for peerbundle)
            event: "",          // event to send repeatedly in the bundle
            eventSel: this,     // selector for event (default: selector for peerbundle)
            endEvent: "",       // event that ends the bundle
            endSel: this,       // selector for endEvent (default:  selector for peerbundle)
            collapseTime: 0,    // don't send event if it occurs less than collapseTime ms from previous sent event
            sendTime: null,     // send event every sendTime ms, even if we don't receive an endEvent
            timing: true        // if true, recipient attempts to replay bundle with same timing, if false all events are replayed instantly
        },options);
        settings.bundleId = null;
        
        // if there are no startEvents, then treat events as startEvents
        if (!settings.startEvent) {
            settings.startEvent = settings.event;
            settings.startSel = settings.eventSel;
        }
        startWatch();
        return this;
    
        function startWatch() {
            settings.startSel.bind(addNamespace(settings.startEvent, "peerbundleStart"), function(e) {
                if (e.srcPeer) return;
                settings.startSel.unbind(addNamespace(settings.startEvent, "peerbundleStart"));
                settings.bundleId = settings.timing ? new Date().getTime() : null;
                $.fn.peerbind.addPeerInfo(e);
                e.selector = settings.startSel.selector;
                settings.bundle = [e];
                $.fn.peerbind.track.add("putbundle", e);
                checkSendTime();
                settings.eventSel.bind(addNamespace(settings.event, "peerbundleEvent"), function(e) {
                    if (e.srcPeer) return;
                    $.fn.peerbind.addPeerInfo(e);
                    if (settings.collapseTime && settings.bundle.length > 0 && e.timeStamp - settings.bundle[settings.bundle.length-1].timeStamp < settings.collapseTime) {
                        $.fn.peerbind.track.add("skipbundle", e);
                        return;  // discard this event if it is too soon after the previous event
                    }
                    e.selector = settings.eventSel.selector;
                    $.fn.peerbind.track.add("putbundle", e);
                    settings.bundle.push(e);
                    checkSendTime();
                })
                if (settings.endEvent) {
                    settings.endSel.bind(addNamespace(settings.endEvent, "peerbundleEnd"), function(e) {
                        if (e.srcPeer) return;
                        $.fn.peerbind.addPeerInfo(e);
                        e.selector = settings.endSel.selector;
                        $.fn.peerbind.track.add("putbundle", e);
                        settings.bundle.push(e);
                        sendEvents();
                        settings.eventSel.unbind(addNamespace(settings.event, "peerbundleEvent"));
                        settings.endSel.unbind(addNamespace(settings.endEvent, "peerbundleEnd"));
                        startWatch();
                    })
                }
            })
        }
        
        function checkSendTime() {
            if (settings.sendTime && !settings.sendTo) {
                settings.sendTo = setTimeout(function() {
                    settings.sendTo = null;
                    sendEvents();
                }, settings.sendTime)
            }
        }
        
        function sendEvents() {
            if (settings.sendTo) {
                clearTimeout(settings.sendTo);
                settings.sendTo = null;
            }
            var bundle = settings.bundle;
            settings.bundle = [];
            var s="[";
            $.fn.peerbind.track.add("startbundle", settings.bundleId);
            for (var i=0; i<bundle.length; i++) {
                $.fn.peerbind.track.add("bundlesend", bundle[i]);
                bundle[i].bundleId = settings.bundleId;
                s += (i==0?'':',') + $.fn.peerbind.getEventString(bundle[i], bundle[i].selector);
            }
            s += ']';
            $.fn.peerbind.postEventString(s, null);
            $.fn.peerbind.track.add("endbundle", settings.bundleId);
        }
        
        function addNamespace(events, namespace) {
            var a = $.trim(events).split(/ +/);
            for (var i=0; i<a.length; i++) {
                a [i] += "." + namespace;
            }
            return a.join(" ");
        }
    }

    $.fn.peerbind.getEventString = function(e, selector) {
        //Check to see if there are multiple selectors...
        if ( selector.match(/,/) ) {
            //its multi.  Find the one we want.
            //A.k.a. The fewest elements which
            //we are in.
            var selectors = selector.split(/,/);
            var len = 20000;
            var winningSelector = null;
            for ( var i = 0; i < selectors.length; i++ ) {
                var elems = jQuery(selectors[i]);
                if ( $.inArray(e.currentTarget,elems) >= 0 ) {
                    if ( elems.length < len ) {
                        len = elems.length;
                        winningSelector = selectors[i];
                    }
                }
            }

            if ( winningSelector != null ) {
                selector = winningSelector;
            }
        }

        var matchElems = jQuery(selector);
        if ( matchElems.length > 1 ) {
            for ( var i = 0; i < matchElems.length; i++ ) {
                if ( e.currentTarget == matchElems[i] ) {
                    selector = selector + ":eq("+i+")";
                    break;
                }
            }
        }

        var peerData = e.peerData;
        if ( e.peerData instanceof Array )
            peerData = '["'+e.peerData.join('-==-,-==-').replace(/"/g,'\\"').replace(/-==-/g,'"')+'"]';

        var posE = e;
        if ( e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0] ) {
            posE = e.originalEvent.touches[0];
        }

        return '{"src":"'+$.fn.peerbind.defaults.uuid+'","s":"'+selector+'","t":"'+e.type+'"' +
                (e.bundleId ? ',"bu":'+e.bundleId: '')+
                (e.keyCode ? ',"k":'+e.keyCode : '')+
                (e.charCode ? ',"c":'+e.charCode : '')+
                (e.which ? ',"w":'+e.which: '')+
                (posE.pageX !== undefined ? ',"px":'+posE.pageX+',"py":'+posE.pageY  : '') +',"d":"'+
                encodeURIComponent((peerData ? peerData : '')).replace(/"/g,'\\"') +
                (e.bundleData ? '","b":"'+e.bundleData.replace(/"/g,'\\"') : '') +
                '","o":'+(e.timeStamp||new Date().getTime()) + packPeerInfo(e)+ '}';
        
        function packPeerInfo(e) {
            var s = '';
            if (e.peerInfo) {
                if (e.peerInfo.value) {
                    s += ',"iv":"' + encodeURIComponent(e.peerInfo.value.replace(/"/g,'\\"')) + '"';
                }
                if (e.peerInfo.currentTargetOffset) {
                    s += ',"il":' + e.peerInfo.currentTargetOffset.left + ',"it":' + e.peerInfo.currentTargetOffset.top;
                }
            }
            return s;
        }
    }

    $.fn.peerbind.postPeerEvent = function(e, selector) {
        $.fn.peerbind.track.add("send", e);
        var eventObjectString = $.fn.peerbind.getEventString(e, selector);
        $.fn.peerbind.postEventString(eventObjectString, e.peerTarget);
    }
    
    $.fn.peerbind.postEventString = function(eventObjectString, peerTarget) {
        if ( !$.fn.peerbind.state.registered ) {
            var oldCallback = $.fn.peerbind.defaults.regcallback;
            $.fn.peerbind.defaults.regcallback = (function(eventObjectString, peerTarget, oldCallback) {
                return (function() {
                    $.fn.peerbind.postEventString(eventObjectString, peerTarget);
                    if ( jQuery.isFunction(oldCallback) )
                        oldCallback();
                });
            })(eventObjectString, peerTarget, oldCallback);
            return;
        }
        

        //This code handles making sure the post go out.
        //Count the posts made.
        $.fn.peerbind.state.postcalls++;

        //Create a function name out of it for the closure
        var funcName = "peerbindPost"+$.fn.peerbind.state.postcalls;

        //The closure that handles the housekeeping for the
        //callback.
        $.fn.peerbind[funcName] = (function(funcName) {
            return (function(data) {
                //Clear this call back.
                $.fn.peerbind.state.callswaiting[funcName] = null;
                clearInterval($.fn.peerbind.state.callintervals[funcName]);
                $.fn.peerbind.state.callintervals[funcName] = null;

                //Clear the closure so we only handle the reponse once.
                $.fn.peerbind[funcName] = function() { };

                //The final posting of the response to the rest of the system.
                jQuery.fn.peerbind.peerbindPost(data);
            });
        })(funcName);

        //Before the event object goes out the door, check to see if the old uuid needs to
        //be replaced with the new, tab enhanced uuid.
        eventObjectString = eventObjectString.replace(new RegExp($.fn.peerbind.defaults.uuidbase+"([^-])","g"),$.fn.peerbind.defaults.uuid+"$1");

        //note the reference to the closure function in this url.
        var url = 'http://'+$.fn.peerbind.peerbindGetEndpoint()+'/post/?f=$.fn.peerbind.'+funcName+'&g='+$.fn.peerbind.defaults.uuid+'&t='+$.fn.peerbind.defaults.type+'&e='+encodeURIComponent(eventObjectString)+"&_t="+(new Date().getTime()) + "&d="+$.fn.peerbind.defaults.regstring;

        //See if they need to provide a referer.
        if ( $.fn.peerbind.defaults.referer ) {
            url += "&u="+encodeURIComponent($.fn.peerbind.defaults.referer);
        }

        //Check to see if this is a directed event. Directed events let you target
        //a specific queue.
        if ( peerTarget )
            url += '&q='+encodeURIComponent(peerTarget);

        
        //Finally send along the post.
        $.fn.peerbind.ajax({
            url: url,
            dataType: "script"
        });

        //Create the object encapsulating the data needed to re-send the post.
        $.fn.peerbind.state.callswaiting[funcName] = { f: $.fn.peerbind[funcName], u: url };

        //Record an interval so that we can check to see if the post ever finally
        //made it.  We know its gone out the door when the function object
        //is null for this function name.
        $.fn.peerbind.state.callintervals[funcName] = setInterval((function(fn) { 
            return (function() {
                //Grab the data object out by function name.
                var fObject = $.fn.peerbind.state.callswaiting[fn];
                if ( fObject != null ) {
                    //Re-send.
                    $.fn.peerbind.ajax({
                        url: fObject.u,
                        dataType: "script"
                    });
                }
            });
        })(funcName), 2000);
    } //End post event.
        
    $.fn.peerbind.eventWatcher = function() {
        if ( !$.fn.peerbind.state.registered ) {
            return;
        }

        //If the last event request was more than 5 seconds old then do another.
        //Note we clear the timestamp when a response is received.
        if ( new Date().getTime() - $.fn.peerbind.state.pollstart > $.fn.peerbind.defaults.pollmax ) {
            clearTimeout($.fn.peerbind.state.polltimeout);
            $.fn.peerbind.state.polltimeout = null;

            $.fn.peerbind.state.pollstart = new Date().getTime();

            var url = 'http://'+$.fn.peerbind.peerbindGetEndpoint()+'/poll/?f=jQuery.fn.peerbind.peerbindTrigger&g='+$.fn.peerbind.defaults.uuid+'&w='+($.fn.peerbind.defaults.pollmax-1000)+'&t='+$.fn.peerbind.defaults.type+"&_t="+(new Date().getTime()) + "&d="+$.fn.peerbind.defaults.regstring; 

            //See if they need to provide a referer.
            if ( $.fn.peerbind.defaults.referer ) {
                url += "&u="+$.fn.peerbind.defaults.referer;
            }

            $.fn.peerbind.ajax({
                url: url,
                dataType: "script"
            });
        }
    }

    // adds various peerbind specific information to the event in the peerInfo object
    $.fn.peerbind.addPeerInfo = function(e) {
        // for change events, store value in peerInfo.value
        if (e.type == 'change' && e.currentTarget) {
            addInfo('value', $(e.currentTarget).val());
        }
        // for mouse events, store the offset of the currentTarget in peerInfo.currentTargetOffset
        if (e.pageX !== undefined && e.currentTarget) {
            addInfo('currentTargetOffset', $(e.currentTarget).offset());
        }
        function addInfo(key, value) {
            if (!e.peerInfo) {
                e.peerInfo = {};
            }
            e.peerInfo[key] = value;
        }
        
    }
    
    $.fn.peerbind.dupEvent = function(eventObj) {
        var triggeredEvents = $.fn.peerbind.state.triggeredevents;

        var duplicate = false;
        if ( !triggeredEvents[eventObj.src] ) {
            triggeredEvents[eventObj.src] = [];
        }

        for ( var i = 0; i < triggeredEvents[eventObj.src].length; i ++ ) {
            var oldEvent = triggeredEvents[eventObj.src][i];
            if ( oldEvent.t == eventObj.t && oldEvent.o == eventObj.o && 
                 oldEvent.px == eventObj.px && oldEvent.py == eventObj.py &&
                 oldEvent.k == eventObj.k ) {
                duplicate = true;
                break;
            }
        }

        if ( !duplicate ) {
            var sourcedEvents = triggeredEvents[eventObj.src];
            triggeredEvents[eventObj.src][sourcedEvents.length] = eventObj;
            $.fn.peerbind.state.triggeredevents = triggeredEvents;

            clearTimeout($.fn.peerbind.state.triggereclean);
            $.fn.peerbind.state.triggereclean = setTimeout( $.fn.peerbind.triggerClean, 30000 );
        }

        return duplicate;
    }

    $.fn.peerbind.triggerClean = function() {
        var triggeredEvents = $.fn.peerbind.state.triggeredevents;
        var now = new Date().getTime();

        for ( var srcName in triggeredEvents ) {
           var newECollection = [];
           for ( var i = 0; i < triggeredEvents[srcName].length; i++ ) {
               var eventObj = triggeredEvents[srcName][i];
               if ( now - eventObj.o < 30000 ) {
                   newECollection[newECollection] = eventObj;
               }
           }

           triggeredEvents[srcName] = newECollection;
        }

        $.fn.peerbind.state.triggeredevents = triggeredEvents 
    }

    $.fn.peerbind.peerbindTrigger = function(data, delay) {
        var count = ++$.fn.peerbind.peerbindTrigger.count;
        if ( delay == 0 ) {
            $.fn.peerbind.state.pollstart = null;
            if ( $.fn.peerbind.state.polltimeout == null )
                $.fn.peerbind.state.polltimeout = setTimeout($.fn.peerbind.eventWatcher,10);
        }
        else {
            $.fn.peerbind.defaults.pollmax = delay * 10000;
        }   

        //Deal with this data. 
        if ( !data || data.length == 0 )
            return;

        $.fn.peerbind.track.add("startreceive", count);
        var hasBundle = false;
        //Trigger events. 
        for ( var i = 0; i < data.length; i++ ) {
            var eventObj = data[i];
            if ( eventObj && eventObj.src != $.fn.peerbind.defaults.uuid && !$.fn.peerbind.dupEvent(eventObj) ) {
                var triggerTarget = eventObj.s;
                if ( triggerTarget == "document" ) {
                    triggerTarget = document;
                }
                else if ( triggerTarget == "window" ) {
                    triggerTarget = window;
                }

                var e = new jQuery.Event(eventObj.t);
                e.target = $(triggerTarget)[0];
                e.pageX = eventObj.px;
                e.pageY = eventObj.py;
                e.currentTargetX = eventObj.ox;
                e.currentTargetY = eventObj.oy;
                e.which = eventObj.w;
                e.keyCode = eventObj.k;
                e.charCode = eventObj.c;
                e.srcPeer = eventObj.src;
                e.timeStamp = eventObj.o;
                e.peerInfo = {};
                if (eventObj.iv !== undefined) {
                    e.peerInfo.value = decodeURIComponent(eventObj.iv);
                }
                if (eventObj.il !== undefined || eventObj.it !== undefined) {
                    e.peerInfo.currentTargetOffset = {left: eventObj.il,top:eventObj.it};
                }
       
                //Check to see if this peer is blacklisted.
                if ( $.fn.peerbind.blacklist[e.srcPeer] )
                    continue;

                e.peerData = decodeURIComponent(eventObj.d);
                if ( e.peerData.match(/^\[/) ) {
                    //Clean it.
                    e.peerData = e.peerData.replace(/\(/g,'');

                    //Then eval the array.
                    try
                    {
                        e.peerData = $.parseJSON(e.peerData);
                    }
                    catch(ex)
                    {
                    }
                }

                e.bundleData = eventObj.b;
                if ( e.bundleData ) {
                    e.bundleData = e.bundleData.replace(/\(/g,'');
                    //Then eval the array.
                    try
                    {
                        e.bundleData = jQuery.parseJSON(e.bundleData);
                    }
                    catch(ex)
                    {
                    }
                }

                if (eventObj.bu) {
                    $.fn.peerbind.addToBundle(e, eventObj.bu);
                    hasBundle = true;
                } else {
                    $(triggerTarget).trigger(e);
                    $.fn.peerbind.track.add("trigger", e);
                }
                $.fn.peerbind.track.add("receive", e);

            }
        }
        if (hasBundle) {
            checkBundles()
        };
        $.fn.peerbind.track.add("endreceive", count);
    };
    $.fn.peerbind.peerbindTrigger.count = 0;

    $.fn.peerbundleplay = function(eventObj) {
        this.each(function() {
             var curTime = 0;
             var startPos = null;
             for ( var i = 0; i < eventObj.bundleData.length; i++ ) {
                 var bundle = eventObj.bundleData;
                 if ( i == 0 ) {
                     curTime = bundle[i].t;
                     $(this).css({left: bundle[i].ex,top:bundle[i].ey});
                     startPos = {x:bundle[i].lx,y:bundle[i].ly};
                 }
                 else {
                     if ( startPos ) {
                        if ( bundle[i]["ex"] )
                            $(this).animate({left: bundle[i].ex,top:bundle[i].ey},bundle[i].t - curTime);
                        else
                            $(this).animate({left: bundle[i].x - startPos.x,top:bundle[i].y-startPos.y},bundle[i].t - curTime);
                     }
                     else
                        if ( bundle[i]["ex"] )
                            $(this).animate({left: bundle[i].ex,top:bundle[i].ey},bundle[i].t - curTime);
                        else
                            $(this).animate({left: bundle[i].x,top:bundle[i].y},bundle[i].t - curTime);

                     curTime = bundle[i].t;
                 }
             }
        });

        return this;
    }

    $.fn.peerbind.registerDevice = function(multipleTriesExpected) {
        if ( $.fn.peerbind.state.registered ) {
            if ( !multipleTriesExpected )
                $.fn.peererror("Attempting to register when we are already registered. Clear the 'registered' field in the state object.");
            return;
        }

        if ( $.fn.peerbind.state.registering ) {
            if ( !multipleTriesExpected )
                $.fn.peererror("Attempting to register while an attempt is in progress.");
            return;
        }

        //Pull in the black lists.  Black list files should look like:
        /*
        $.fn.peerbind.blacklist = {
            "guid1":1,
            "guid2":1,
            "guid3":1
            .
            .
            .
        } 
        */

        //Note: The code expects either/or.  If there is a blacklist on 
        //both - its a race condition.
        //Pull the blacklist for this domain - if there is one:
        setTimeout(function() { 
            try {
                $.fn.peerbind.ajax({
                    url: "http://"+document.location.host+"/peerbind.blacklist.js",
                    dataType: "script"
                });
            } catch(ex) {
            }
        },100);

        //And load the one for this page if there is one.
        setTimeout(function() {
            try {
                $.fn.peerbind.ajax({
                    url: (document.location.href+"").replace(/(.*)\/[^\/]*/,"$1/peerbind.blacklist.js"),
                    dataType: "script"
                });
            }
            catch(ex) {
            }
        },100);

        $.fn.peerbind.state.registering = true;
        $.fn.peerbind.registerUUID($.fn.peerbind.establishUUID());
    }

    $.fn.peerbind.establishUUID = function() {
     
        if ( localStorage && localStorage["peeruuid"] && localStorage.peeruuid != "" ) {
            $.fn.peerbind.defaults.uuid = localStorage.peeruuid;
            $.fn.peerbind.defaults.uuidbase = localStorage.peeruuid;
        }
        else if ( $.fn.peerbind.defaults.uuid ) {
            //Nop.
        }
        else {
            var seed1 = (new Date()).getTime() + Math.floor(Math.random()*10000);
            var seed2 = (new Date()).getTime();
            var seed3 = (new Date()).getTime() + Math.floor(Math.random()*100000);

            var prefix = Math.floor(Math.random(seed1 * 100) * 10000000);
            var suffix = Math.floor(Math.random(seed2 * 100) * 10000000);
            var suffix2 = Math.floor(Math.random(seed3 * 100) * 10000000);

            var uuid = prefix+"-"+suffix+"-"+suffix2;

            if ( localStorage ) {
                localStorage.peeruuid = uuid;
            }

            $.fn.peerbind.defaults.uuid = uuid;
            $.fn.peerbind.defaults.uuidbase = uuid;
        }
     
        return $.fn.peerbind.defaults.uuid;
    }


    $.fn.peerbind.registerUUID = function(uuid) {

        function handleRegistration() {
            var type = $.fn.peerbind.defaults.type;
            var url = 'http://'+$.fn.peerbind.peerbindGetEndpoint()+'/register/?f=jQuery.fn.peerbind.peerbindRegister&g='+uuid+'&t='+type+"&_t="+(new Date().getTime());

            //See if they need to provide a referer.
            if ( $.fn.peerbind.defaults.referer ) {
                url += "&u="+$.fn.peerbind.defaults.referer;
            }

            if ( type == "geo" && navigator && navigator.geolocation ) {
                navigator.geolocation.watchPosition((function(url) {
                        return ( function(location) { 
                            if ( $.fn.peerbind.defaults.coords.lat != location.coords.latitude || 
                                    $.fn.peerbind.defaults.coords.long != location.coords.longitude ) {
                                $.fn.peerbind.defaults.coords.lat = location.coords.latitude;
                                $.fn.peerbind.defaults.coords.long = location.coords.longitude;
                                var data = encodeURIComponent(location.coords.latitude + "," + location.coords.longitude);
                                $.fn.peerbind.defaults.regstring = data;
                                $.fn.peerbind.ajax({
                                    url: url + "&d=" + data,
                                    dataType: "script"
                                });
                            }
                        });
                })(url), function() {
                    //No location:
                    $.fn.peerbind.defaults.regstring = "0,0";
                    $.fn.peerbind.ajax({
                        url: url + "&d=0,0",
                        dataType: "script"
                    });
                });
            }
            else {
                $.fn.peerbind.ajax({
                    url: url + "&d=" + $.fn.peerbind.defaults.regstring,
                    dataType: "script"
                });
            }

            setInterval($.fn.peerbind.eventWatcher, 1000);
        }
        
        var myPingTime = (new Date()).getTime();
        var pingsAnswered = [];
        var latestPong = -1;

        $(window).bind("storage", (function(myPingTime, pingsAnswered) {
            return (function(e) {
                var pingTime = localStorage["peerping"] - 0;

                //Ping occurred within 500 millis... and its not my ping.
                if ( ((new Date()).getTime() - pingTime) < 500 && pingTime != myPingTime && pingsAnswered[pingTime] == null ) {
                    pingsAnswered[pingTime] = 1;
                    localStorage["peerpong"] = (localStorage.peerpong - 0) + 1 + $.fn.peerbind.state.pongcount;
                }

                //In case we get a "pong" that is a stragler - meaning it happens after the 100ms we wait.
                if ( pingTime == myPingTime && ( localStorage.peerpong - 0 != 0 ) && (latestPong != localStorage.peerpong)) {
                    latestPong = localStorage.peerpong;
                    uuid = uuid + "-" + localStorage.peerpong;
                    $.fn.peerbind.state.pongcount = (localStorage.peerpong - 0) + 1;
                    $.fn.peerbind.defaults.uuid = uuid;
                    handleRegistration();
                }
            });
        })(myPingTime, pingsAnswered));

        //Trigger the storage event.
        if ( localStorage ) {
            //Start the count.
            localStorage.removeItem("peerpong");
            localStorage["peerpong"] = 0;

            //Clear any ping that might be there, then cause an event.
            localStorage.removeItem("peerping");
            localStorage["peerping"] = myPingTime;

            //Check to see how many pongs we got.
            setTimeout((function(uuid) {
                    return (function() {
                        if (latestPong == -1 || latestPong != localStorage.peerpong ) {
                            if ((localStorage.peerpong - 0) != 0) { 
                                latestPong = localStorage.peerpong;
                                uuid = uuid + "-" + localStorage.peerpong;
                                $.fn.peerbind.state.pongcount = (localStorage.peerpong - 0) + 1;
                            }

                            $.fn.peerbind.defaults.uuid = uuid;
                            handleRegistration();
                        }
                    });
            })(uuid), 50);
        }
   }

    $.fn.peerbind.peerbindRegister = function(data) {
        $.fn.peerbind.state.registering = false;
        $.fn.peerbind.state.registered = true;

        if ( $.fn.peerbind.defaults.regcallback ) {
            $.fn.peerbind.defaults.regcallback($.fn.peerbind.defaults);
        }
    };

    $.fn.peerbind.peerbindPost = function(data) {
    };

    $.fn.peerbind.peerbindGetEndpoint = function() {
       var prefixes = $.fn.peerbind.defaults.endpointprefixes;
       if ( prefixes && prefixes.length > 0 ) {
           var curPrefix = prefixes[$.fn.peerbind.state.endpointct % prefixes.length];
           $.fn.peerbind.state.endpointct++;

           return curPrefix + "." + $.fn.peerbind.defaults.endpoint;
       }
       else
           return $.fn.peerbind.defaults.endpoint;
    }

    $.fn.peertrigger = function(type, data, peerTarget) {
        this.each(function() {
          //Make sure this type of event is bound.
          if ( !$(this).data("peerbound"+type) ) {
              $(this).peerbind(type, null);
          }

          var e = new jQuery.Event(type+".pbind");
          e.data = data;
          e.peerData = data;
          e.peerTarget = peerTarget;
          e.srcPeer = null;

          $(this).trigger(e);
        });
 
        return this;
    };

    $.fn.peerunbind = function(type) {
        this.each(function() {
            $(this).unbind(type+".pbind");
        });
 
        return this;
   };

    //Allow direct access to the registration.
    $.fn.peerregister = function(/*settings,*/ callback) {
       //See if they want to change the defaults here.
       if ( callback && !$.isFunction(callback) && $.isPlainObject(callback) ) {
            //Yup set the
            $.extend(true, $.fn.peerbind.defaults, callback);
            
            callback = null;
            if ( arguments[1] ) {
                callback = arguments[1];
            }
       }

       if ( callback )
           $.fn.peerbind.defaults.regcallback = callback;

       if ( !$.fn.peerbind.state.registered )
           $.fn.peerbind.registerDevice();
       else if ( callback ) {
           callback();
       }
    }
 
    //This can be overriden for your own output method.
    $.fn.peererror = function(msg) {
        if ( window["console"] && window.console["log"] ) {
           window.console.log("Peerbind error: " + msg);           
        }
    }

    $.fn.peerbind.registerwithname = function(name, callback) {
        if ( !name ) {
           //Get the name.
        }
        else {
           $.fn.peerbind.state.namedregistering = false;
           $.fn.peerbind.state.namedserverdone = false;
           $.fn.peerbind.defaults.namedServerName = name;
           $.fn.peerbind.defaults.namedServerCallback = callback;
           //Register Request: http://www.peerbind.com/register/?f=f&g=uniqueId&t=page           
           //Referer: http://peerbind.com/iphoneserver/0.1/
           var findServerURL = "http://www.peerbind.com/register/?f=$.fn.peerbind.namedRegDone&g="+$.fn.peerbind.establishUUID()+"&t=page&u="+encodeURIComponent("http://peerbind.com/iphoneserver/0.1/"+name)+"&_t=" + (new Date()).getTime();
           $.fn.peerbind.ajax({
                url: findServerURL,
                dataType: "script"
           });
        }
    }

    $.fn.peerbind.namedRegDone = function() {
        if ( !$.fn.peerbind.state.namedserverdone ) {
           var postServerURL = "http://www.peerbind.com/post/?f=$.fn.peerbind.pollForServerResponse&g="+$.fn.peerbind.defaults.uuid+"&t=page&e=['sendmesomethingplease']&u="+encodeURIComponent("http://peerbind.com/iphoneserver/0.1/"+$.fn.peerbind.defaults.namedServerName)+"&_t=" + (new Date()).getTime();

           //See if they need to provide a referer.
           if ( $.fn.peerbind.defaults.referer ) {
               postServerURL += "&u="+$.fn.peerbind.defaults.referer;
           }

           $.fn.peerbind.ajax({
                url: postServerURL,
                dataType: "script"
           });

           setTimeout($.fn.peerbind.namedRegDone, 3000);
        }
    }

    $.fn.peerbind.pollForServerResponse = function() {
       if ( !$.fn.peerbind.state.namedserverdone ) {
           var pollServerURL = "http://www.peerbind.com/poll/?f=$.fn.peerbind.namedServerResponse&g="+$.fn.peerbind.defaults.uuid+"&t=page&u="+encodeURIComponent("http://peerbind.com/iphoneserver/0.1/"+$.fn.peerbind.defaults.namedServerName)+"&_t=" + (new Date()).getTime();

            //See if they need to provide a referer.
            if ( $.fn.peerbind.defaults.referer ) {
                pollServerURL += "&u="+$.fn.peerbind.defaults.referer;
            }

           $.fn.peerbind.ajax({
                url: pollServerURL,
                dataType: "script"
           });

           setTimeout($.fn.peerbind.pollForServerResponse, 3000);
       }

    }

    $.fn.peerbind.namedServerResponse = function(data) {
       if ( data && data.length ) {
           for ( var i = 0; i < data.length; i++ ) {
               if ( data[i] && data[i].server && !$.fn.peerbind.state.namedregistering ) {
                   $.fn.peerbind.defaults.endpointprefixes = [];
                   $.fn.peerbind.defaults.endpoint = data[i].server + ":" + data[i].port;
                   $.fn.peerbind.state.namedserverdone = true;
                   $.fn.peerbind.state.registered = false;
                   $.fn.peerbind.state.registering = false;
                   $.fn.peerbind.state.namedregistering = true;
                   $.fn.peerregister($.fn.peerbind.defaults.namedServerCallback);
                   break;
               }
           }
       }
    }

    $.fn.peerbind.ajax = function(obj) {
        if ( $.fn.peerbind.defaults.type != "disabled" ) {
            $.ajax(obj);
        }
    }
    
    $.fn.peerbind.track = function(cmd) {
        switch (cmd) {
            case 'start':
                $.fn.peerbind.track.tracking = true;
                $.fn.peerbind.track.list = [];
                break;
            case 'stop':
                $.fn.peerbind.track.tracking = false;
                $.fn.peerbind.track.list = null;
                break;
            case 'get':
                return $.fn.peerbind.track.list;
        }
    }
    $.fn.peerbind.track.add = function(type, arg) {
        if ($.fn.peerbind.track.tracking) {
            $.fn.peerbind.track.list.push({type:type, arg:arg});
        }
    }

    $.fn.peerbind.bundles = {};
    // add a bundled event to the bundle.  After adding all bundle events in a group, call checkBundles()
    $.fn.peerbind.addToBundle = function(e, bundleId) {
        var bundles = $.fn.peerbind.bundles;
        if (!bundles[bundleId]) {
            bundles[bundleId] = {
                list:[],
                lastTimeStamp: e.timeStamp,  // the timestamp of the last event processed
                lastTime: new Date().getTime()  // time we processed last event
            }
        }
        var bundle = bundles[bundleId];
        bundle.list.push(e);
        if (bundle.list.length > 1 && bundle.list[bundle.list.length-1].timeStamp < bundle.list[bundle.list.length-2].timeStamp) {
            // the event was out of sequence.  Mark this bundle as needing sorting
            bundle.needsSort = true;
        }
    }
    
    // call this after adding all bundled events in a group.  Check which ones need triggering.  This is also
    // called after timeouts for the next event
    function checkBundles() {
        var nextTime = Number.MAX_VALUE;  // set this to the time before the next event to trigger
        var curTime = new Date().getTime();
        var bundles = $.fn.peerbind.bundles;
        if (bundles.timeout) {
            clearTimeout(checkBundles.timeout);
            bundles.timeout = null;
        }
        for (var bid in bundles) {
            var bundle = bundles[bid];
            if (bundle.list.length == 0) {
                // if there is nothing on the list and it has been 5 seconds since the last event was processed,
                // toss the bundle
                if (curTime - bundle.lastTime >= 5000) {
                    delete bundles[bid];
                }
            } else {           
                if (bundle.needsSort) {
                    bundle.list.sort(function(a,b) {return a.timeStamp - b.timeStamp});
                    bundle.needsSort = false;
                }
                // figure out which events are already due
                var baseTime = bundle.lastTimeStamp + curTime - bundle.lastTime;
                while (bundle.list.length > 0 && bundle.list[0].timeStamp <= baseTime) {
                    var e = bundle.list.shift();
                    $(e.target).trigger(e);
                    $.fn.peerbind.track.add("trigger", e);
                    bundle.lastTimeStamp = e.timeStamp;
                    bundle.lastTime = curTime;
                }
                // figure out the next time this bundle needs to trigger
                var myNextTime;
                if (bundle.list.length > 0) {
                    myNextTime = bundle.list[0].timeStamp - baseTime;
                } else {
                    // if the bundle is empty and stays empty for 5 seconds, we want to delete it
                    myNextTime = 5000 - (curTime - bundle.lastTime);
                }
                if (myNextTime < nextTime) {
                    nextTime = myNextTime;
                }
            }
        }
        if (nextTime < Number.MAX_VALUE) {
            checkBundles.timeout = setTimeout(checkBundles, nextTime);
        }
    }

    $.fn.peerbind.types = [
        "domain",
        "page",
        "ip",
        "geo",
        "string",
        "disabled"
    ];

    $.fn.peerbind.state = {
         'registered':false,
         'pollstart':null,
         'polltimeout':null,
         'postcalls':0,
         'endpointct':0,
         'callswaiting':[],
         'callintervals':[],
         'triggeredevents':[],
         'pongcount':0,
         'namedserverdone':false
    };

    $.fn.peerbind.defaults = {
         'endpointprefixes':["www","www1","www2","www3","www4","www5","www6","www7","www8","www9","www10"],
         'endpoint':"peerbind.com",
         'referer':document.location.href+"",
         'uuid':null,
         'uuidbase':null, //When there is only one tab in the browser this will match uuid.
         'type':$.fn.peerbind.types[1],
         'regstring':'',
         'coords': { lat: 0, long: 0 },
         'coordsSet': false,
         'pollinterval':500,
         'pollmax':31000,
         'regcallback':null
    };

    $.fn.peerbind.blacklist = {
    };
})(jQuery);
