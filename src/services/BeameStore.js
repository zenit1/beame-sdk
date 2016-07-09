
'use strict';
var fs = require('fs');
var path = require('path');
var _=require('underscore');
var os = require('os');
var debug = require("debug")("collectauthdata");
require('./../utils/Globals');
var jmespath = require('jmespath');
var beameDirApi = require('./BeameDirServices');
var sprintf =require('sprintf');

// The idea is this object framework above BeameDirServices.js
// BeameStore will load the directory and manage it in memory as well be capabale proving high level
// API to work with JSON. 
//
// BeameStore.prototype.listCurrentDevelopers 
// BeameStore.prototype.listCurrentAtoms
// BeameStore.prototype.listCurrentEdges
// There functions right now return all developers, atoms edges. Then with the search function you can query indivulal levels.
//
//

// beame.store offers api for accessing beame.dir datastructre, upon construction it will parse the directory structure, and produce a json object structure.
//

function BeameStore(beamedir){
	if(!beamedir ||  beamedir.length === 0){
		beamedir = global.devPath;
	}

	this.beameStore = beameDirApi.readBeameDir(beamedir);
	this.listFunctions = [];

	this.listFunctions.push( {type: "developer" , 'func' : this.listCurrentDevelopers });
	this.listFunctions.push( {type: "atom" , 'func' : this.listCurrentAtoms });
	this.listFunctions.push( {type: "edgeClient", 'func': this.listCurrentEdges });
}

BeameStore.prototype.jsearch= function (searchItem, level){
	if(!searchItem){
		return new Error({"Status": "error", "Message":"searchDevelopers called with either name and fqdn"});
	}
	
	var queryString = "";

	switch(level) {
		case "developer":
		{
			queryString =  sprintf("[?(hostname=='%s' )|| (name =='%s' )].{name:name, hostname:hostname, level:level} ", searchItem, searchItem );
			break;
		}

		case "atom":
		{
			queryString = sprintf("[].atom[?(hostname=='%s') || (name=='%s')].{name:name, hostname:hostname, level:level}| []", searchItem, searchItem );
			break;
		};

		case "edgeClient":
		{
			queryString = sprintf("[].atom[].edgeclient[?(hostname=='%s')].{name:name, hostname:hostname, level:level} | []", searchItem, searchItem );
			break;
		};
		default:
		{
			new Error("Invalid level passed to search ", level);
		}
	}
	debug("Query string " + queryString );
	var objects = jmespath.search(this.beameStore, queryString );
	return objects;
};

BeameStore.prototype.searchDevelopers = function(name) {
	var names = this.jsearch(name, "developer");
	var returnDict = [];

	_.each(names, _.bind(function (item) {
		var qString = sprintf("[?hostname == '%s'] | []", item.hostname);
		returnDict= returnDict.concat(jmespath.search(this.beameStore, qString));
	}, this));
	return returnDict;
};

BeameStore.prototype.searchAtoms = function(name){
	var names = this.jsearch(name, "atom");
	var returnDict = [];

	_.each(names, _.bind(function (item) {
		var qString = sprintf("[].atom[?hostname == '%s'] | []", item.hostname);
		returnDict= returnDict.concat(jmespath.search(this.beameStore, qString));
	}, this));
	return returnDict;
};

BeameStore.prototype.searchEdge =  function(name){
	var names = this.jsearch(name, "edgeClient");
	var returnDict = [];

	_.each(names, _.bind(function (item) {
		var qString = sprintf("[].atom[].edgeclient[?hostname == '%s'] | []", item.hostname);
		returnDict= returnDict.concat(jmespath.search(this.beameStore, qString));
	}, this));
	return returnDict;
};

BeameStore.prototype.listCurrentDevelopers = function() {
	return jmespath.search(this.beameStore, "[*].{name:name, hostname:hostname, level:level} | []");
}

BeameStore.prototype.listCurrentAtoms = function(){
	return jmespath.search(this.beameStore, "[*].atom[*].{name:name, hostname:hostname, level:level} | []");
}

BeameStore.prototype.listCurrentEdges = function(){
 	return jmespath.search(this.beameStore, "[].atom[].edgeclient[*].{name:name, hostname:hostname, level:level} | []");
};

BeameStore.prototype.search = function(type) {
	var returnArray = [];
	if(type && type.length){
		var listFunc = _.where(this.listFunctions, {'type': type});
		if(listFunc.length != 1){
			throw new Error("Listfunc dictionary is broken -- bad code change ")
		}
		var newArray = listFunc[0].func.call(this);
		returnArray = returnArray.concat(newArray);
	}else{
		_.each(this.listFunctions, _.bind(function(item){
			returnArray = returnArray.concat(item.func.call(this));
		}, this));
	}
	return returnArray;
};

module.exports = BeameStore;
