
(function(global, undefined) {

  var Model = function(apiUrl, apiKey) {

      this.apiUrl = apiUrl;
      this.apiKey = apiKey;
  };

  Model.prototype._GET = function(path, callback) {

    callback = typeof callback === 'function' ? callback : function() {};

    var xhr = new XMLHttpRequest();

    xhr.addEventListener('load', function() {

      try {
        var response = JSON.parse(this.responseText);
        callback(null, response);
      } catch (err) {
        console.error(err);
        callback(new Error('Non valid JSON'));
      }
    });

    xhr.addEventListener('error', function() {

      callback(new Error('Error: ' + (this.status ? this.statusText : 'request failed')));
    });

    xhr.open('GET', path, true);

    xhr.send();
  };

  Model.prototype.getPhotos = function(params, callback) {

    var query = {
      method: 'flickr.photos.getRecent',
      api_key: this.apiKey,
      page: params ? params.page : 1,
      per_page: params ? params.perPage: 50,
      extras: 'url_m',
      format: 'json',
      nojsoncallback: 1
    };

    var queryString = Object.keys(query).map(function(key) {

      return key + '=' + query[key];
    })
    .join('&');

    return this._GET(this.apiUrl + '?' + queryString, callback);
  };

  var View = function(rootElement) {

    this.rootElement = rootElement;
  };

  var model = new Model('https://api.flickr.com/services/rest/', 'bde8d7724318c876c5f974772dc62e31');
})(window);
