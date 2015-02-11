"use strict";

var _ = require("underscore");
var View = require("substance-application").View;
var $$ = require("substance-application").$$;
var SearchbarView = require("./searchbar_view");


// Browser.View Constructor
// ========
//

var BrowserView = function(controller) {
  View.call(this);

  this.controller = controller;
  this.$el.attr({id: "container"});

  // Elements
  // --------

  // Search bar
  // ------------

  this.searchbarView = new SearchbarView(this.controller.searchQuery);

  // List of found documents
  // ------------
  // 

  this.facetsEl = $$('#facets');
  this.documentsEl = $$('#documents');
  this.previewEl = $$('#preview');

  // Loading indicator
  this.loadingEl = $$('.loading', {html: '<div class="spinner-wrapper"><div class="spinner"></div><div class="message">Loading documents</div></div>'});

  // Wrap what we have into a panel wrapper
  this.panelWrapperEl = $$('.panel-wrapper');
  this.panelWrapperEl.appendChild(this.facetsEl);
  this.panelWrapperEl.appendChild(this.documentsEl);
  this.panelWrapperEl.appendChild(this.previewEl);
  this.panelWrapperEl.appendChild(this.loadingEl);

  // Event handlers
  // ------------

  // $(this.searchButton).click(_.bind(this.startSearch, this));
  // $(this.searchFieldEl).change(_.bind(this.startSearch, this));
  this.$el.on('click', '.value', _.bind(this.toggleFilter, this));
  this.$el.on('click', '.title a', _.bind(this.togglePreview, this));

  // Should this work on the controller?
  // this.searchbarView.on('search:changed', _.bind(this.startSearch, this));
};

BrowserView.Prototype = function() {

  // Session Event handlers
  // --------
  //

  // this.startSearch = function(e) {
  //   var searchData = this.searchbarView.getSearchData();
  //   var searchFilters = searchData.filters;

  //   this.controller.switchState({
  //     id: "main",
  //     searchstr: searchData.searchStr,
  //     searchFilters: searchFilters
  //   });
  // };

  // Show the loading indicator
  this.showLoading = function() {
    $(this.loadingEl).show();
  };

  // Hide the loading indicator
  this.hideLoading = function() {
    $(this.loadingEl).hide();
  };

  this.togglePreview = function(e) {
    e.preventDefault();

    var documentId = $(e.currentTarget).parent().parent().attr('data-id');

    // Update state
    this.controller.switchState({
      id: "main",
      searchstr: this.controller.state.searchstr,
      documentId: documentId,
      filters: this.controller.state.filters || "",
      searchFilters: this.controller.state.searchFilters || ""
    });
  };

  // Toggle a filter
  // ---------------
  this.toggleFilter = function(e) {
    e.preventDefault();

    var facetName = e.currentTarget.dataset.facet;
    var value = e.currentTarget.dataset.value;

    // TODO: this preparing of new filter state is quite hacky.
    // We need to find a better way

    // Make deep copy, so we don't mess up with the oldState
    var filters = JSON.parse(JSON.stringify(this.controller.searchResult.filters));

    // Implicitly remove a filter if already set
    if ($(e.currentTarget).hasClass('selected')) {
      filters[facetName] = _.without(filters[facetName], value);
      
      if (filters[facetName].length === 0) {
        delete filters[facetName];
      }
    } else {
      // Add new filter
      if (!filters[facetName]) {
        filters[facetName] = [];
      }
      filters[facetName].push(value);
    }

    // Update state
    this.controller.switchState({
      id: "main",
      searchstr: this.controller.state.searchstr || "",
      filters: filters || {},
      searchFilters: this.controller.state.searchFilters || []
    });
  };

  // Rendering
  // ==========================================================================
  //

  // After state transition
  // --------------
  // 
  // TODO: optimize! (currently we re-render everything)

  this.afterTransition = function(oldState, newState) {
    console.log('after transition');
    if (newState.id === "main") {
      // console.log('searchstr', newState.searchstr);

      // Prepare search data for searchbar view
      // this.searchbarView.setSearchData({
      //   searchstr: newState.searchstr,
      //   // It's important that we pass a clone here, so the searchbar doesn't mess with the state variable object
      //   searchFilters: newState.searchFilters ? JSON.parse(JSON.stringify(newState.searchFilters)) : []
      // });

      // if (newState.searchstr) {
      this.renderSearchResult();

        // if the search has not changed then 'likely' the filter has
        // TODO: could be detected more explicitly
        // if (oldState.searchstr === newState.searchstr) {
        //   console.log('filters have been changed...');
        //   this.renderSearchResult();
        // }
      // } else {
      //   // TODO: render 'moderated' list of documents
      //   alert('no search string specified');
      // }
    }
  };

  // Clear element registry
  // --------------

  this.clearElementRegistry = function() {
    this.elementIndex = {};
  };

  // Register DOM element in element registry for easy lookup by key later
  this.registerElement = function(facetName, value, el) {
    if (!this.elementIndex[facetName]) {
      this.elementIndex[facetName] = {};
    };

    if (!this.elementIndex[facetName][value]) {
      this.elementIndex[facetName][value] = [];
    }
    this.elementIndex[facetName][value].push(el);
  };

  // Get DOM element from element registry
  this.getElements = function(facetName, value) {
    if (!this.elementIndex[facetName]) return null;
    return this.elementIndex[facetName][value];
  };

  // Display initial search result
  this.renderSearchResult = function() {

    // Check if there's an actual search result
    if (!this.controller.searchResult) return;

    this.documentsEl.innerHTML = "";

    // Hide loading indicator
    this.hideLoading();

    // highlight previewed document
    var documentId = this.controller.state.documentId;

    // Clear element index
    this.clearElementRegistry();

    // Get filtered documents
    var documents = this.controller.searchResult.getDocuments();


    if (documents.length > 0) {
      _.each(documents, function(doc, index) {
        var authors = [];

        _.each(doc.authors, function(author) {
          var authorEl = $$('span.author.facet-occurence', {text: author});
          this.registerElement("authors", author, authorEl);
          authors.push(authorEl);
        }, this);

        var categoriesEl = $$('.categories');
        var articleTypeEl = $$('.article_type.facet-occurence', {text: doc.article_type });
        categoriesEl.appendChild(articleTypeEl);
        this.registerElement("article_type", doc.article_type, articleTypeEl);

        // Iterate over subjects and display
        _.each(doc.subjects, function(subject) {
          var subjectEl = $$('.subjects.facet-occurence', {text: subject});
          categoriesEl.appendChild(subjectEl);
          this.registerElement("subjects", subject, subjectEl);
        }, this);

        var documentEl = $$('.document', {
          "data-id": doc.id,
          children: [
            // $$('a.toggle-preview', {href: '#', html: '<i class="fa fa-eye"></i> Preview'}),
            $$('.published-on', {text: new Date(doc.published_on).toDateString() }),
            $$('.title', {
              children: [$$('a', {href: '#', html: doc.title})]
            }),
            $$('.authors', {
              children: authors
            }),
            // $$('.intro', {text: doc.intro}),
            categoriesEl
          ]
        });

        if (documentId === doc.id) {
          documentEl.classList.add("active");
        } else if (!documentId && index === 0) {
          // Highlight first result by default
          documentEl.classList.add("active");
        }

        this.documentsEl.appendChild(documentEl);
      }, this);
    } else {
      // Render no search result
      this.documentsEl.appendChild($$('.no-result', {text: "Your search did not match any documents"}));
    }
  
    this.renderFacets();
    this.renderPreview();
  };

  this.renderFacets = function() {
    this.facetsEl.innerHTML = "";

    this.availableFacets = $$('.available-facets');
    this.facetsEl.appendChild(this.availableFacets);

    var facets = this.controller.searchResult.getAvailableFacets();

    // Render facets
    _.each(facets, function(facet) {
      var facetEl = $$('.facet.'+facet.property);

      // Filter name
      facetEl.appendChild($$('.facet-name', { text: facet.name }));
      var facetValuesEl = $$('.facet-values');

      // Filter values + frequency in doc corpus
      _.each(facet.values, function(facetValue) {
        var facetValueEl = $$('a.value'+(facetValue.selected ? '.selected' : ''), {
          href: "#",
          "data-facet": facet.property,
          "data-value": facetValue.name,
          text: facetValue.name + " ("+facetValue.frequency+")"
        });

        // this.registerElement(facet.property, facetValue.name);
        facetValuesEl.appendChild(facetValueEl);
      }, this);

      facetEl.appendChild(facetValuesEl);
      this.availableFacets.appendChild(facetEl);
    }, this);

    this.highlightFacets();
  };

  // Highlight currently filtered facets
  this.highlightFacets = function() {
    $('.facet-occurence.highighted').removeClass('highighted');

    var filters = this.controller.searchResult.filters;
    _.each(filters, function(facetValues, facetName) {      
      _.each(facetValues, function(val) {
        var els = this.getElements(facetName, val);
        $(els).addClass('highlighted');
      }, this);
    }, this);
  };

  this.renderPreview = function() {
    this.previewEl.innerHTML = "";

    var previewData = this.controller.previewData;
    if (!previewData) return;

    // Details container
    var detailsEl = $$('.details');

    var publishDateEl = $$('.published-on', {
      html: new Date(previewData.document.published_on).toDateString()
    });

    detailsEl.appendChild(publishDateEl);

    var documentId = this.controller.state.documentId;

    var titleEl = $$('.title', {
      html: previewData.document.title
    });

    detailsEl.appendChild(titleEl);
    var authorsEl = $$('.authors', {html: previewData.document.authors.join(', ') });
    detailsEl.appendChild(authorsEl);

    var linksEl = $$('.links', {
      children: [
        $$('a', {href: previewData.document.url, html: '<i class="fa fa-external-link-square"></i> Open in Lens', target: '_blank'}),
        $$('a', {href: previewData.document.pdf_url, html: '<i class="fa fa-file-pdf-o"></i> PDF', target: '_blank'})
      ]
    });

    detailsEl.appendChild(linksEl);
    this.previewEl.appendChild(detailsEl);
  
    var fragmentsEl = $$('.fragments');

    if (previewData.fragments.length > 0) {
      var fragmentsIntroEl = $$('.intro', {html: previewData.fragments.length+' matches for "'+this.controller.state.searchstr+'"'});
      fragmentsEl.appendChild(fragmentsIntroEl);      
    }

    _.each(previewData.fragments, function(fragment) {
      fragmentsEl.appendChild($$('.fragment', {
        children: [
          $$('.content', {html: fragment.content}),
          $$('.links', {
            children: [
              $$('a', {href: previewData.document.url+"#content/"+fragment.id, html: '<i class="fa fa-external-link-square"></i> Read more', target: '_blank'})
            ]
          })
        ]
      }));
    }, this);

    this.previewEl.appendChild(fragmentsEl);
  };

  this.render = function() {
    console.log('BrowserView#render');
    this.el.innerHTML = "";
    this.el.appendChild(this.searchbarView.render().el);
    this.el.appendChild(this.panelWrapperEl);
    return this;
  };

  this.dispose = function() {
    this.stopListening();
    if (this.mainView) this.mainView.dispose();
  };
};

// Export
// --------

BrowserView.Prototype.prototype = View.prototype;
BrowserView.prototype = new BrowserView.Prototype();

module.exports = BrowserView;
