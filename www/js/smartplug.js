
'use strict';

var SmartPlugData = {
    service: "FFF0",
    order: "FFF3",
    notif: "FFF4",
    onOrder: new Uint8Array([0x0f,0x06,0x03,0x00,0x01,0x00,0x00,0x05,0xFF,0xFF]),
    offOrder: new Uint8Array([0x0f,0x06,0x03,0x00,0x00,0x00,0x00,0x04,0xFF,0xFF]),
    statusOrder: new Uint8Array([0x0f,0x06,0x04,0x00,0x00,0x00,0x00,0x05,0xFF,0xFF])
};


function SmartPlug(deviceId,name,forceState,updateHandler,autoCutOff,autoCutOffDelay){
    this.deviceId=deviceId;
    this.name=name;
    this.forceState=forceState;
    this.connected=false;
    if (typeof autoCutOff !== 'undefined')
	this.autoCutOff=autoCutOff;
    else
	this.autoCutOff=-1;
    if (typeof autoCutOffDelay!== 'undefined')
	this.autoCutOffDelay=autoCutOffDelay;
    else
	this.autoCutOffDelay=1000000;
    this.lastCutOffRecord=0;
    this.powerValue=-1; // default to -1 mean not connected
    this.stateValue=-1; // default to not connected
    this.updateHandler= updateHandler;
}

SmartPlug.prototype.onError = function(e){
    //console.log("error receive");
    //console.log(e);
    // check we are still connected:
    var plug=this;
    if (e==133)
	ble.isConnected(this.deviceId,null,function(e){
	    // try to reconnect...
	    console.log("we are not connected anymore... make a scan and reconnect");
	    plug.disconnect();
	    ble.scan([],5,function(e){if (e.id==plug.deviceId) plug.connect();},function(){}); // scan for device during 5 seconds...
	    setTimeout(function(){plug.onError(133);},6000);
	});
};

SmartPlug.prototype.power = function(){
    return this.powerValue;
};

SmartPlug.prototype.state = function(){
    return this.stateValue;
};

SmartPlug.prototype.switchOn = function(){
    console.log("switch on");
    //console.log(this);
    if (this.connected){
	var plug=this;
	ble.write(this.deviceId,SmartPlugData.service,SmartPlugData.order,SmartPlugData.onOrder.buffer,function(){
	    plug.stateValue=1;
	    plug.lastCutOffRecord = 0;
	},this.onError.bind(this));
    }
};

SmartPlug.prototype.switchOff = function(){
    console.log("switch off");
    //console.log(this);
    if (this.connected){
	var plug=this;
	ble.write(this.deviceId,SmartPlugData.service,SmartPlugData.order,SmartPlugData.offOrder.buffer,function(){plug.stateValue=0;},this.onError.bind(this));
    }
};

var inAsk=false;

SmartPlug.prototype.askStatus = function(){
    //console.log("ask for status");
    //console.log(this);
    if (this.connected){
	var plug=this;
	ble.write(this.deviceId,SmartPlugData.service,SmartPlugData.order,SmartPlugData.statusOrder.buffer,function(){},this.onError.bind(this));
    }
};

SmartPlug.prototype.updateStatus = function(data) {
    //console.log("sartplug update status (notif)");
    //    console.log(this);
    //console.log(data);
    //console.log("notif data are:",data);
    var message="";
    var a = new Uint8Array(data);
    //console.log("data as an array are:");
    //console.log(a);
    if ((a[0]==0x0f) && (a[1]==0x04) && (a[2]==0x03)){
	//console.log("notification of a change");
	return ;
    }
    if ((a[0]==0x0f) && (a[1]==0x0f) && (a[2]==0x04)){
	// read state:
	var state=a[4];
	if ((this.forceState) && (this.stateValue!=state)){
	    if (this.stateValue==1) this.switchOn();
	    else this.switchOff();
	}
	else{
	    if (a[4]==0) this.stateValue=0;
	    else this.stateValue=1;
	}
	// read power:
	var power=0;
	//console.log(a[6]);
	//console.log(power);
	power=a[6]<<24 | a[7] << 16 | a[8]<<8 | a[9];
	//console.log(power);
	power/=1000.0;
	if ((state==1) && (this.autoCutOff!=0) && (power<this.autoCutOff) ){
	    if (this.lastCutOffRecord==0){
		this.lastCutOffRecord=Date.now()/1000.0;
	    } else if (((Date.now()/1000.0) - this.lastCutOffRecord)>=this.autoCutOffDelay){
		this.switchOff();
	    }
	}
	this.powerValue=power;
	if (this.updateHandler!=null){
	    this.updateHandler(this);
	}
    }
    if (this.connected)
	setTimeout(this.askStatus.bind(this),1000);
};

SmartPlug.prototype.connect = function(){
    console.log("try to connect....");
    if (this.connected) return;
    var plug=this;
    ble.connect(this.deviceId, function(){
	console.log("successfully connected");
	plug.connected=true;
	// set the notification handler
	ble.startNotification(plug.deviceId, SmartPlugData.service, SmartPlugData.notif, function(d){plug.updateStatus(d);},function(e){plug.onError(e);});
	// set the timer for 5 sec. notification
	setTimeout(function(){plug.askStatus();},1000);
    }, function(e){plug.onError(e);}); 
};

SmartPlug.prototype.disconnect = function(){
    if (this.connected==true){
	var plug=this;
	ble.disconnect(this.deviceId,function(){
	    plug.connected=false;
	    plug.powerValue=-1;
	    plug.stateValue=-1;	    
	},function(e){plug.onError(e);});
    }
}
