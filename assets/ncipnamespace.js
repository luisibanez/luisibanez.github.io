/// ncipnamespace
///
/// Copyright 2013 Kitware Inc.
/// Apache 2.0 License
///
///

window.NCIPGlobal = (function () {

  var that = {};

  var listOfRepos = [];
  var listOfMembers = [];
  var listOfOrgsReposReceived = [];
  var listOfOrgsMembersReceived = [];
  var listOfOrgsRequested = [];

  that.processReposCallback = function() {};
  that.processMembersCallback = function() {};

  that.namespace = function(ns_string) {

    /// Writen after example from "JavaScript Patterns", pages 89-90.

    var parts = ns_string.split('.'),
        parent = NCIPGlobal,
        i;

    // strip redundant leading global
    if (parts[0] === "NCIPGlobal" ) {
      parts = parts.slice(1);
      }

    for (i = 0; i < parts.length; i += 1) {
      // create a property if it doesn't exist
      if (typeof parent[parts[i]] === "undefined") {
        parent[parts[i]] = {};
        }
      // insert the property in a nested pattern
      parent = parent[parts[i]];
      }

    return parent;

    };

  that.initializeCache = function() {

    NCIPGlobal.namespace('cache.orgs');
    NCIPGlobal.namespace('cache.repos');
    NCIPGlobal.namespace('cache.reposDate');
    NCIPGlobal.namespace('cache.members');
    NCIPGlobal.namespace('cache.membersDate');

    };

  that.getJSONIfModified = function(uri,sinceDate,successFunction) {

    function clientSideUpdate() {

        if (xhr.readyState === 4) {

          var result = {};

          if (xhr.status===200) {
            result.data = JSON.parse(xhr.responseText);
            }

          result.status = xhr.status;
          result.lastModified = xhr.getResponseHeader('Last-Modified');

          successFunction(result);
          }

        }

    var xhr = new XMLHttpRequest();

    xhr.open('get',uri,true);

    xhr.onreadystatechange = clientSideUpdate;

    if (sinceDate) {
      xhr.setRequestHeader('If-Modified-Since',sinceDate);
      }

    xhr.send(null);

    };

  that.getCachedRepositories = function() {
    var cachedRepos = window.localStorage.getItem('NCIPrepos');
    if (cachedRepos) {
      NCIPGlobal.cache.repos = JSON.parse(cachedRepos);
      var repos = NCIPGlobal.cache.repos;
      return repos;
      }
    return null;
    };

  that.getCachedMembers = function() {
    var cachedMembers = window.localStorage.getItem('NCIPmembers');
    if (cachedMembers) {
      NCIPGlobal.cache.members = JSON.parse(cachedMembers);
      var members = NCIPGlobal.cache.members;
      return members;
      }
    return null;
    };

  that.getLastReposChangeDateInCache = function(org,page) {

    var lastModifiedDate = null;

    if (window.localStorage) {

      var localStorageDates = window.localStorage.getItem('NCIPReposDate');

      if ( localStorageDates !== "undefined" && localStorageDates !== null) {
        NCIPGlobal.cache.reposDate = JSON.parse( localStorageDates );
        var orgDates = NCIPGlobal.cache.reposDate[org];
        if (orgDates) {
          lastModifiedDate = orgDates[page];
          }
        }
      }

    return lastModifiedDate;

    };

  that.storeLastReposChangeDateInCache = function(org,page,lastModifiedDate) {

    NCIPGlobal.namespace('cache.reposDate.'+org);
    NCIPGlobal.namespace('cache.reposDate.'+org+'.'+page);

    NCIPGlobal.cache.reposDate[org][page] = lastModifiedDate;

    if (window.localStorage) {
      window.localStorage.setItem('NCIPReposDate', JSON.stringify( NCIPGlobal.cache.reposDate ) );
      }

    };


  that.getReposFromOneOrg = function(org,page) {

        page = page || 1;

        var uri = "https://api.github.com/orgs/" + org + "/repos?"
                + "&per_page=100"
                + "&page="+page;

        var lastModifiedDate = NCIPGlobal.getLastReposChangeDateInCache(org,page);


        NCIPGlobal.getJSONIfModified(uri,lastModifiedDate, function (result) {

          if ( result.status === 403 ) { // Refused

            listOfOrgsReposReceived.push(org);

            listOfRepos = NCIPGlobal.getCachedRepositories();

            if( listOfOrgsReposReceived.length === listOfOrgsRequested.length ) {
              NCIPGlobal.processReposCallback(listOfRepos);
              }

            }

          if ( result.status === 304 ) { // Not Modified

            listOfOrgsReposReceived.push(org);

            listOfRepos = NCIPGlobal.getCachedRepositories();

            if( listOfOrgsReposReceived.length === listOfOrgsRequested.length ) {
              NCIPGlobal.processReposCallback(listOfRepos);
              }

            }

          if ( result.status === 200 ) { // OK Status

            if (result.data && result.data.length > 0) {
              // Concatenate with previous pages
              listOfRepos = listOfRepos.concat(result.data);
              NCIPGlobal.storeLastReposChangeDateInCache(org,page,result.lastModified);
              // Go on recursively
              NCIPGlobal.getReposFromOneOrg(org, page + 1);
              }
            else {
              // Completed paginating the repos
              listOfOrgsReposReceived.push(org);

              if( listOfOrgsReposReceived.length === listOfOrgsRequested.length ) {
                NCIPGlobal.storeReposInCache();
                NCIPGlobal.processReposCallback(listOfRepos);
                }
              }

            }

        });
      };

  that.populateListOfRequestOrgs = function() {

      var setOfOrgs = JSON.parse( NCIPGlobal.cache.orgs );

      listOfOrgsRequested = [];

      for (var org in setOfOrgs) {
        listOfOrgsRequested.push(org);
        }
    };

  that.clearListOfReceivedReposOrgs = function() {

      listOfOrgsReposReceived = [];

      }

  that.clearListOfReceivedMembersOrgs = function() {

      listOfOrgsMembersReceived = [];

      }

  that.getReposFromAllOrgs = function() {

      NCIPGlobal.populateListOfRequestOrgs();
      NCIPGlobal.clearListOfReceivedReposOrgs();

      var setOfOrgs = JSON.parse( NCIPGlobal.cache.orgs );

      for (var org in setOfOrgs) {
        NCIPGlobal.getReposFromOneOrg(org);
        }

    };

  that.storeMembersInCache = function() {

    if (listOfMembers) {
      NCIPGlobal.cache.members = JSON.stringify(listOfMembers);
      window.localStorage.setItem('NCIPmembers',NCIPGlobal.cache.members);
      }

    };

  that.storeReposInCache = function() {

    if (listOfRepos) {
      NCIPGlobal.cache.repos = JSON.stringify(listOfRepos);
      window.localStorage.setItem('NCIPrepos',NCIPGlobal.cache.repos);
      }

    };

  that.findAllOrgsFromReposCatalog = function(reposCatalog) {

      var setOfOrgs = {};

      for (var i = 0; i < reposCatalog.length; i++) {
        var pieces = reposCatalog[i].full_name.split("/");
        var orgName = pieces[0].toLowerCase();
        setOfOrgs[orgName] = true;
        }

      NCIPGlobal.cache.orgs = JSON.stringify(setOfOrgs);

    };

  that.storeLastMembersChangeDateInCache = function(org,lastModifiedDate) {

      NCIPGlobal.cache.membersDate[org] = lastModifiedDate;

      if (window.localStorage) {
        window.localStorage.setItem('NCIPMembersDate',JSON.stringify(NCIPGlobal.cache.membersDate ) );
        }

    };

  that.getLastMembersChangeDateInCache = function(org) {

      var lastModifiedDate = null;

      if (window.localStorage) {

        var localStorageDates = window.localStorage.getItem('NCIPMembersDate');

        if ( localStorageDates !== "undefined" && localStorageDates !== null) {
          NCIPGlobal.cache.membersDate = JSON.parse( localStorageDates );
          lastModifiedDate = NCIPGlobal.cache.membersDate[org];
          }
        }

    return lastModifiedDate;

    };

  that.getMembersFromAllOrgs = function() {

      NCIPGlobal.populateListOfRequestOrgs();
      NCIPGlobal.clearListOfReceivedMembersOrgs();

      var setOfOrgs = JSON.parse( NCIPGlobal.cache.orgs );

      for (var org in setOfOrgs) {
        NCIPGlobal.getMembersFromOneOrg(org);
        }

    };


  that.getMembersFromOneOrg = function (org) {

      var uri = 'https://api.github.com/orgs/' + org + '/members';

      var lastMemberDateChange = NCIPGlobal.getLastMembersChangeDateInCache(org);

      NCIPGlobal.getJSONIfModified(uri, lastMemberDateChange, function (result) {

        listOfOrgsMembersReceived.push(org);

        if ( result.status === 403 ) { // Refused

          listOfMembers = NCIPGlobal.getCachedMembers();

          if( listOfOrgsMembersReceived.length === listOfOrgsRequested.length ) {
            NCIPGlobal.processMembersCallback(listOfMembers);
            }

          }

        if ( result.status === 304 ) { // Not Modified

          listOfMembers = NCIPGlobal.getCachedMembers();

          if( listOfOrgsMembersReceived.length === listOfOrgsRequested.length ) {
            NCIPGlobal.processMembersCallback(listOfMembers);
            }

          }

        if ( result.status === 200 ) { // OK Status

          // Concatenate with previous organizations
          listOfMembers = listOfMembers.concat(result.data);

          if( listOfOrgsMembersReceived.length === listOfOrgsRequested.length ) {
            NCIPGlobal.storeLastMembersChangeDateInCache(org,result.lastModified);
            NCIPGlobal.storeMembersInCache();
            NCIPGlobal.processMembersCallback(listOfMembers);
            }

          }

        });

      };

  that.urlQueryString = function(key) {

        var vars = [], hash;
        var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');

        for(var i = 0; i < hashes.length; i++) {
            hash = hashes[i].split('=');
            vars.push(hash[0]);
            vars[hash[0]] = hash[1];
          }

        return vars[key];

      };

  return that;

}());
