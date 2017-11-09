
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

    return this._GET(this.apiUrl + '?' + queryString, function(err, response) {

      if (response && response.stat === 'ok') {
        return callback(null, response.photos);
      }

      callback(err);
    });
  };

  var View = function(params) {

    params = params || {};

    this.rootElement = params.rootElement;
    this.imgHeight = params.imgHeight || 120;
    this.container = this.rootElement.querySelector('.container');
    this.onKeyDown = null;
  };

  View.prototype.selectElement = function(index) {

    var elements = document.querySelectorAll('.photo-container');

    for (var i = 0; i < elements.length; i++) {

      if (i !== index && elements[i].classList.contains('active')) {
        elements[i].classList.remove('active');
      }
      if (i === index) {
        elements[i].classList.add('active');
      }
    }
  };

  View.prototype.scrollToRow = function(row) {

    var heightWithMargin = this.imgHeight + 14;
    var startPosition = parseInt(this.container.style.top.replace('px', '') || 0);

    this.container.style.top = -(heightWithMargin * row ) + 'px';
  }

  View.prototype.render = function(photos, done) {

    var self = this;

    var fragment = document.createDocumentFragment();

    photos.forEach(function(photo, index) {

      var container = document.createElement('div');
      var img = document.createElement('img');
      container.className = 'photo-container';
      container.style.height = self.imgHeight + 'px';
      container.dataset.index = index;
      img.className = 'photo'
      img.src = photo.url_m;
      container.appendChild(img)
      fragment.appendChild(container);
    });

    this.container.appendChild(fragment);
    done();
  };

  View.prototype.removeElements = function(count) {

    var elements = document.querySelectorAll('.photo-container');

    for (var i = 0; i < elements.length; i++) {
      if (i >= count) {
        return;
      }
      elements[i].remove();
    }
  };

  var Controller = function(view, model) {

    this.view = view;
    this.model = model;
    this.elements = [];
    this.selectedElementIndex = null;
    this._onWheel = false;
    this.initialize();
  };

  Controller.prototype.initialize = function() {

    var self = this;

    self.getPhotos(1, 50, function() {

      self.view.selectElement(0);
      this.selectedElementIndex = 0;
    });

    self.view.rootElement.addEventListener('wheel', self.onWheel.bind(self));

    document.addEventListener('keyup', self.onKeyUp.bind(self));

  };

  Controller.prototype.onKeyUp = function(event) {

    switch (event.keyCode) {
      // left arrwo
      case 37:
        this.moveSelectElement(-1);
        break;
      // up arrow
      case 38:
        this.moveSelectElement(-5);
        break;
      // right arrow
      case 39:
        this.moveSelectElement(1);
        break;
      // down arrow
      case 40:
        this.moveSelectElement(5);
        break;
    }
  };

  Controller.prototype.onWheel = function(event) {

    if (this._onWheel) {
      return false;
    }

    var self = this;

    setTimeout(function() {
      self.moveSelectElement(event.deltaY > 0 ? 5 : -5);
      self._onWheel = false;
    }, 150);

    self._onWheel = true;
  };

  Controller.prototype.moveSelectElement = function(step) {

    var newPosition = this.selectedElementIndex + step;
    var allElementsLength = this.elements.length;
    var row = Math.floor(newPosition / 5);

    if ((allElementsLength - newPosition) <= 10) {
      this.view.removeElements(40);
      newPosition = newPosition - 40;
      row = 0;
    }

    if (newPosition >= 0 && newPosition <= (allElementsLength - 1)) {
      this.view.selectElement(newPosition);
      this.selectedElementIndex = newPosition;
      this.view.scrollToRow(row);
    }
  };

  Controller.prototype.getPhotos = function(page, count, done) {

    var self = this;

    self.model.getPhotos({ page: page, perPage: count }, function(err, response) {

      if (err) {
        return err;
      }

      self.elements = response.photo;
      self.view.render(self.elements, done);
    });
  };

  var model = new Model('https://api.flickr.com/services/rest/', 'bde8d7724318c876c5f974772dc62e31');
  var view = new View({
    rootElement: document.getElementById('app'),
    imgHeight: 120
  });
  var controller = new Controller(view, model);

  window.app = controller;
})(window);
