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
  var listOfOrgsReceived = [];
  var listOfOrgsRequested = [];

  that.processReposCallback = function() {};

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

  that.getLastReposChangeDateInCache = function(org) {

    if (window.localStorage) {

      var localStorageDates = window.localStorage.getItem('NCIPDate');

      console.log('getLastReposChangeDateInCache ');
      console.log( localStorageDates );

      if ( localStorageDates !== "undefined" && localStorageDates !== null) {
        console.log( 'dates from cache' );
        console.log( localStorageDates );
        NCIPGlobal.cache.reposDate = JSON.parse( localStorageDates );
        console.log('AZUCAR');
        console.log( NCIPGlobal.cache.reposDate );
        }
      }

    var lastModifiedDate = NCIPGlobal.cache.reposDate[org];
    console.log('lastModifiedDate = '+lastModifiedDate);

    return lastModifiedDate;

    };

  that.storeLastReposChangeDateInCache = function(org,lastModifiedDate) {

    NCIPGlobal.cache.reposDate[org] = lastModifiedDate;

    if (window.localStorage) {
      window.localStorage.setItem('NCIPDate', JSON.stringify( NCIPGlobal.cache.reposDate ) );
      }

    };


  that.getReposFromOneOrg = function(org,page) {

        page = page || 1;

        var uri = "https://api.github.com/orgs/" + org + "/repos?"
                + "&per_page=100"
                + "&page="+page;

        var lastModifiedDate = NCIPGlobal.getLastReposChangeDateInCache(org);

        console.log('in getReposFromOneOrg ' + org);
        console.log(lastModifiedDate);

        NCIPGlobal.getJSONIfModified(uri,lastModifiedDate, function (result) {

          if ( result.status === 403 ) { // Refused
            console.log('NOT MODIFIED 403');
            listOfOrgsReceived.push(org);
            listOfRepos = NCIPGlobal.getCachedRepositories();
            if( listOfOrgsReceived.length === listOfOrgsRequested.length ) {
              NCIPGlobal.processReposCallback(listOfRepos);
              }

            }

          if ( result.status === 304 ) { // Not Modified
            console.log('NOT MODIFIED 304');
            listOfOrgsReceived.push(org);

            listOfRepos = NCIPGlobal.getCachedRepositories();

            if( listOfOrgsReceived.length === listOfOrgsRequested.length ) {
              NCIPGlobal.processReposCallback(listOfRepos);
              }

            }

          if ( result.status === 200 ) { // OK Status

            if (result.data && result.data.length > 0) {
              // Concatenate with previous pages
              listOfRepos = listOfRepos.concat(result.data);
              NCIPGlobal.storeLastReposChangeDateInCache(org,result.lastModified);
              // Go on recursively
              NCIPGlobal.getReposFromOneOrg(org, page + 1);
              }
            else {
              // Completed paginating the repos
              listOfOrgsReceived.push(org);

              if( listOfOrgsReceived.length === listOfOrgsRequested.length ) {
                console.log('listOfOrgsRequested = ' + listOfOrgsRequested);
                NCIPGlobal.storeReposInCache();
                NCIPGlobal.processReposCallback(listOfRepos);
                }
              }

            }

        });
      };

  that.populateListOfRequestOrgs = function() {

      var setOfOrgs = JSON.parse( NCIPGlobal.cache.orgs );

      for (var org in setOfOrgs) {
        listOfOrgsRequested.push(org);
        }
    };

  that.getReposFromAllOrgs = function() {

      NCIPGlobal.populateListOfRequestOrgs();

      var setOfOrgs = JSON.parse( NCIPGlobal.cache.orgs );

      for (var org in setOfOrgs) {
        NCIPGlobal.getReposFromOneOrg(org);
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

  that.storeLastMembersChangeDateInCache = function(result) {

        if (window.localStorage) {

          if (window.localStorage.getItem('NCIPDate') === "undefined" || window.localStorage.getItem('NCIPDate') === null) {
            NCIPGlobal.cache.membersDate = result.lastModified;
            window.localStorage.setItem('NCIPDate',NCIPGlobal.cache.membersDate);
            }
          else {
            NCIPGlobal.cache.membersDate = window.localStorage.getItem('NCIPDate');
            }
          }

        };

  that.processMembers = function(members) {
          $(function () {
            $("#num-members").text(members.length);
          });
        };

  that.getMembers = function (result) {

        if ( result.status === 403 ) { // Refused
          var members = NCIPGlobal.getCachedMembers();
          NCIPGlobal.processMembers(members);
          }

        if ( result.status === 304 ) { // Not Modified
          var members = NCIPGlobal.getCachedMembers();
          NCIPGlobal.processMembers(members);
          }

        if ( result.status === 200 ) { // OK Status
          var members = result.data;
          NCIPGlobal.cache.members = JSON.stringify(members);
          window.localStorage.setItem('NCIPmembers',NCIPGlobal.cache.members);
          NCIPGlobal.processMembers(members);
          NCIPGlobal.storeLastMembersChangeDateInCache(result);
        }

      };


  that.getMembersFromOrganization = function (org) {

      var since = null;

      if (window.localStorage) {
        NCIPGlobal.cache.membersDate = window.localStorage.getItem('NCIPDate');
        since = NCIPGlobal.cache.membersDate;
        }

      NCIPGlobal.getJSONIfModified('https://api.github.com/orgs/' + org + '/members', since, NCIPGlobal.getMembers );

      };

  return that;

}());
