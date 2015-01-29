"use strict";

var _ = require("underscore");
var util = require("substance-util");
var Controller = require("substance-application").Controller;
var BrowserView = require("./browser_view");
var SearchResult = require("./search_result");

var exampleSearchResult = require("../data/searchresult");


// BrowserController
// =============================

var BrowserController = function(app, config) {
  Controller.call(this, app);
  this.config = config;

  this.createView();
};

BrowserController.Prototype = function() {

  this.initialize = function(newState, cb) {
    cb(null);
  };

  this.DEFAULT_STATE = {
    id: "main"
  };

  this.createView = function() {
    if (!this.view) {
      this.view = new BrowserView(this);
    }
    return this.view.render();
  };

  this.transition = function(newState, cb) {
    console.log("BrowserController.transition(%s -> %s)", this.state.id, newState.id);
    // idem-potence
    // if (newState.id === this.state.id) {
    //   var skip = false;
    //   // TODO
    //   skip = true;
    //   if (skip) return cb(null, {skip: true});
    // }

    if (newState.id === "main" && newState.searchstr && newState.searchstr !== this.state.searchstr) {
      this.loadSearchResult(newState, cb);
    } else if (newState.id === "main" && newState.searchstr === this.state.searchstr && newState.filters !== this.state.filters) {
      this.filterDocuments(newState, cb);
    } else {
      console.log('state not explicitly handled', this.state, newState);
      cb(null);  
    }
    
  };

  this.encodeFilters = function() {

  };

  // Get filters from new state
  this.getFilters = function(newState) {
    if (!newState.filters) return {};
    return JSON.parse(newState.filters);
  };

  this.filterDocuments = function(newState, cb) {
    var filters = this.getFilters(newState);
    this.searchResult.applyFilters(filters);
    cb(null);
  };

  this.loadSearchResult = function(newState, cb) {
    // Get filters from app state
    var searchStr = newState.searchstr;
    var documentId = newState.documentId;
    var filters = this.getFilters(newState);
    var self = this;

    console.log('documentId', documentId);

    $.getJSON(this.config.api_url+"/search?searchString="+encodeURIComponent(searchStr), function(data) {

      // TODO: this structure should be provided on the server
      self.searchResult = new SearchResult({
        query: newState.searchstr,
        documents: data
      }, filters);

      // Load preview
      if (documentId) {
        $.ajax({
          url: self.config.api_url+"/search/document?documentId="+encodeURIComponent(documentId)+"&searchString="+encodeURIComponent(searchStr),
          dataType: 'json',
          success: function(data) {
            self.previewData = data;
            cb(null);
          },
          error: function(err) {
            console.error(err.responseText);
            cb(err.responseText);
          }
        });
      } else {
        self.previewData = null;
        cb(null);
      }
    });

    // this.searchResult = new SearchResult(exampleSearchResult, filters);    
  };

  this.afterTransition = function(oldState) {
    var newState = this.state;
    this.view.afterTransition(oldState, newState);
  };

};

BrowserController.Prototype.prototype = Controller.prototype;
BrowserController.prototype = new BrowserController.Prototype();

BrowserController.Controller = BrowserController;

module.exports = BrowserController;