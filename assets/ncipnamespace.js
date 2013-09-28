/// ncipnamespace
///
/// Copyright 2013 Kitware Inc.
/// Apache 2.0 License
///
///

window.NCIPGlobal = (function () {

  var that = {};

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

  that.storeLastReposChangeDateInCache = function(org,date) {

    if (window.localStorage) {

      NCIPGlobal.cache.reposDate = [];

      if (window.localStorage.getItem('NCIPDate') === "undefined" || window.localStorage.getItem('NCIPDate') === null) {
        NCIPGlobal.cache.reposDate[org] = date;
        window.localStorage.setItem('NCIPDate',NCIPGlobal.cache.reposDate);
        }
      else {
        NCIPGlobal.cache.reposDate = window.localStorage.getItem('NCIPDate');
        }
      }

    };


  that.getReposFromGithub = function(org,processRepos,repos,page) {

        page = page || 1;

        var uri = "https://api.github.com/orgs/" + org + "/repos?"
                + "&per_page=100"
                + "&page="+page;

        var since = null;

        if (window.localStorage) {
          NCIPGlobal.cache.reposDate = window.localStorage.getItem('NCIPDate');
          if ( NCIPGlobal.cache.reposDate ) {
            since = NCIPGlobal.cache.reposDate[org];
            }
          }

        NCIPGlobal.getJSONIfModified(uri,since, function (result) {

          if ( result.status === 403 ) { // Refused
            repos = NCIPGlobal.getCachedRepositories();
            if( repos ) {
              processRepos(repos);
              }
            }

          if ( result.status === 304 ) { // Not Modified
            repos = NCIPGlobal.getCachedRepositories();
            if( repos === null) {
              NCIPGlobal.addResultsToCacheAndPage(org,repos,result,processRepos);
              }
            else {
              processRepos(repos);
              }
            }

          if ( result.status === 200 ) { // OK Status
            if (result.data && result.data.length > 0) {
              repos = repos.concat(result.data);
              NCIPGlobal.getReposFromGithub(org,processRepos,repos, page + 1);
              NCIPGlobal.storeLastReposChangeDateInCache(org,result.lastModified);
              }
            }

        });
      };

  that.getReposFromAllOrgs = function(processRepos) {

      var repos = [];

      var orgs = JSON.parse( NCIPGlobal.cache.orgs );

      for (var org in orgs) {
        NCIPGlobal.getReposFromGithub(org,processRepos,repos);
        }

      console.log('repos = ');
      console.log(repos);
      NCIPGlobal.cache.repos = JSON.stringify(repos);
      window.localStorage.setItem('NCIPrepos',NCIPGlobal.cache.repos);
    };

  that.findAllOrgsFromReposCatalog = function(reposCatalog) {

      var organizationsSet = {};

      for (var i = 0; i < reposCatalog.length; i++) {
        var pieces = reposCatalog[i].full_name.split("/");
        var orgName = pieces[0].toLowerCase();
        organizationsSet[orgName] = true;
        }

      NCIPGlobal.cache.orgs = JSON.stringify(organizationsSet);

      console.log(NCIPGlobal.cache.orgs);
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
