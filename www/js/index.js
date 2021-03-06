/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */


'use strict';

var Devices = {
    "UM2GO" :
    {
	deviceId : "E0:E5:CF:1E:68:87",
    },
    "UM2Ext" :
    {
	deviceId : "E0:E5:CF:1E:68:88",
    },
    "UM2A" :
    {
	deviceId : "E0:E5:CF:1E:68:89",
    }
};

var app = {
    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
	authPage.hidden=true;	
        deviceList.addEventListener('touchstart', this.selectDevice, false); // assume not scrolling
        ble.scan([], 5, function(){}, app.onError);
	var obj=this;
	console.log(Devices);
	for(var devId in Devices){
	    var dev=Devices[devId];
	    console.log("for");
	    console.log(dev);
	    console.log(devId);
	    var listItem = document.createElement('div'),
		html = '<b>' + devId + '</b> ' +
                    '(' + dev.deviceId + ') <p class="power"> <p> <div style="float: left;"><img src="img/'+devId+'.jpg" />';
            listItem.dataset.device = devId;  // TODO	    
            Devices[devId].controler = new SmartPlug(dev.deviceId,devId,true,obj.updateDevice.bind(obj),1,10);  // TODO
	    setTimeout(Devices[devId].controler.connect.bind(Devices[devId].controler),10000);
            listItem.innerHTML = html;
	    listItem.id=devId;
            deviceList.appendChild(listItem);
	};
	$("#deviceList").slick();
	var random = new TimeSeries();
	setInterval(function() {
            random.append(new Date().getTime(), Math.random() * 10000);
	}, 100);
      
	function createTimeline() {
	    var chart = new SmoothieChart({millisPerPixel:50,maxValueScale:1.5,grid:{verticalSections:9},timestampFormatter:SmoothieChart.timeFormatter,horizontalLines:[{color:'#ffffff',lineWidth:1,value:0},{color:'#880000',lineWidth:2,value:3333},{color:'#880000',lineWidth:2,value:-3333}]});
	    chart.addTimeSeries(random, {lineWidth:2,strokeStyle:'#00ff00',fillStyle:'rgba(255,0,169,0.54)'});
            chart.streamTo(document.getElementById("chart"), 2000);
	}
	createTimeline();
    },

    updateDevice : function(controler){
	//console.log("get an update");
	//console.log(controler);
	var liItem=document.getElementById(controler.name);
	var newImg="img/"+controler.name;
	if (controler.state()==0){
	    newImg=newImg+"_off.jpg";
	} else if (controler.state()==1){
	    newImg=newImg+"_on.jpg";
	} else
	    newImg=newImg+".jpg";	
	liItem.getElementsByTagName("img")[0].src=newImg;	
	liItem.getElementsByClassName("power")[0].innerText=""+controler.power()+" W";
    },
    
    selectDevice: function(d){
	console.log(d);
	console.log(d.target);
	var liItem=d.target;
	while(liItem.tagName != "LI")
	    liItem = liItem.parentElement;
	var sp=Devices[liItem.dataset.device].controler;
	if (sp.state()==0) sp.switchOn();
	else sp.switchOff();
    },
    onError: function(reason) {
        alert("ERROR: " + reason); // real apps should use notification.alert
    }
};

app.initialize();
