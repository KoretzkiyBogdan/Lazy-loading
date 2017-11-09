
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

  Model.prototype.getPhotoLinks = function(params, callback) {

    callback = typeof callback === 'function' ? callback : function() {};

    var query = {
      method: 'flickr.photos.getRecent',
      api_key: this.apiKey,
      page: params ? params.page : 1,
      per_page: params ? params.perPage: 40,
      extras: 'url_o,url_m',
      format: 'json',
      nojsoncallback: 1
    };

    var queryString = Object.keys(query).map(function(key) {

      return key + '=' + query[key];
    })
    .join('&');

    return this._GET(this.apiUrl + '?' + queryString, function(err, response) {

      if (!response ||  response.stat !== 'ok') {
        return callback(err);
      }

      var photo = response && response.photos ? response.photos.photo : [];

      var links = photo.map(function(photo) {

        return photo.url_m || photo.url_o;
      });

      callback(null, links);
    });
  };

  var View = function(params) {

    params = params || {};

    this.rootElement = params.rootElement;
    this.imgHeight = params.imgHeight || 180;
    this.container = this.rootElement.querySelector('.container');
    // Events
    this.onWheel = function() {};
    this.onKeyDown = function() {};

    this.rootElement.addEventListener('wheel', this.onWheel);
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

  View.prototype.scrollToRow = function(row, animate, callback) {

    var multiplier = row - 1.5;
    var heightWithMargin = this.imgHeight + 44;
    var startPosition = parseInt(this.container.style.top.replace('px', '') || 0);
    var finalPosition = row < 2 ? 0 : -(heightWithMargin * multiplier);
    var currentPosition = startPosition;

    if (!animate) {
      this.container.style.top = finalPosition + 'px';
      return;
    }

    var perStep = (finalPosition - startPosition) / 6;
    var counter = 0;
    var self = this;

    var timer = setInterval(function() {

      if (counter >= 6) {
        typeof callback == 'function' ? callback() : null;
        return clearInterval(timer);
      }

       currentPosition += perStep;
       self.container.style.top = currentPosition + 'px';
       counter++;
    }, 30);
  }

  View.prototype.render = function(links, insertAfter) {

    var self = this;

    var fragment = document.createDocumentFragment();

    links.forEach(function(link) {

      var container = document.createElement('div');
      var img = document.createElement('img');
      container.className = 'photo-container';
      container.style.height = self.imgHeight + 'px';
      img.className = 'photo'
      img.src = link;
      container.appendChild(img)
      fragment.appendChild(container);
    });

    insertAfter ? this.container.appendChild(fragment): this.container.insertBefore(fragment, this.container.firstChild);
  };

  View.prototype.removeElements = function(count, fromStart) {

    var elements = document.querySelectorAll('.photo-container');
    var maxIndex = elements.length - 1;
    var i = fromStart ? 0 : maxIndex;
    var step = fromStart ? 1 : -1;

    while (fromStart ? i < count : i > (maxIndex - count)) {
      elements[i].remove();
      console.log(1);
      i += step;
    }
  };

  var Controller = function(view, model) {

    this.view = view;
    this.model = model;
    this.photoPerPage = 50;
    this.availableOffset = 15;
    this.page = 1;
    this.photoLinks = [];
    this.selectedElementIndex = 0;
    this._onWheel = false;
    this._onRequest = false;
    this.initialize();
  };

  Controller.prototype.initialize = function() {

    var self = this;

    self.model.getPhotoLinks({ page: self.page, perPage: self.photoPerPage}, function(err, links) {

      if (err) {
        return err;
      }

      self.photoLinks = self.photoLinks.concat(links);
      self.view.render(self.photoLinks.slice(-self.photoPerPage), true);
      self.view.selectElement(self.selectedElementIndex);
      self.view.scrollToRow(1);
    });

    self.view.rootElement.addEventListener('wheel', self.onWheel.bind(self));
    self.view.onWheel = self.onWheel.bind(self);

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

  Controller.prototype.getMorePhotos = function() {

    if (this._onRequest) {
      return;
    }

    var self = this;
    var newPage = self.page + 1;

    var startIndex = self.page * self.photoPerPage;
    var endIndex = startIndex + (self.photoPerPage - self.availableOffset);

    // Check chache
    if (endIndex < self.photoLinks.length) {

      console.log('Fetch photo from cache');

      self.selectedElementIndex = (self.selectedElementIndex % 5) + 5;
      self.view.removeElements(self.photoPerPage - self.availableOffset, true);
      self.view.render(self.photoLinks.slice(startIndex, endIndex), true);
      self.view.selectElement(self.selectedElementIndex);
      self.view.scrollToRow(2);
      self.page = newPage;
      return;
    }

    self._onRequest = true;

    self.model.getPhotoLinks({ page: newPage, perPage: self.photoPerPage }, function(err, links) {

      self._onRequest = false;

      if (err) {
        return err;
      }

      self.page = newPage;
      self.photoLinks = self.photoLinks.concat(links);
      self.selectedElementIndex = (self.selectedElementIndex % 5) + 5;
      self.view.removeElements(self.photoPerPage - self.availableOffset, true);
      self.view.render(self.photoLinks.slice(startIndex, endIndex), true);
      self.view.selectElement(self.selectedElementIndex);
      self.view.scrollToRow(2);
    });
  };

  Controller.prototype.backToOldPhotos = function() {

    var self = this;
    var newPage = self.page - 1;

    var startIndex = (newPage - 1) * self.photoPerPage;
    var endIndex = startIndex + (self.photoPerPage - self.availableOffset);

    self.selectedElementIndex = (self.selectedElementIndex % 5) + (self.photoPerPage - self.availableOffset);

    self.view.removeElements(self.photoPerPage - self.availableOffset, false);
    self.view.render(self.photoLinks.slice(startIndex, endIndex), false);
    self.view.selectElement(self.selectedElementIndex);
    self.view.scrollToRow(8);
    self.page = newPage;

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

    if (this._onRequest) {
      return;
    }

    var self = this;
    var newPosition = this.selectedElementIndex + step;
    var allPhotoLinksLength = this.photoLinks.length;
    var maxRows = Math.floor(this.photoPerPage / 5);
    //
    var row = Math.floor(newPosition / 5) + 1;
    var moveUp = row - (Math.floor(this.selectedElementIndex / 5) + 1) === -1;

    if (newPosition < 0) {
      return;
    }

    if (newPosition <= (allPhotoLinksLength - 1)) {
      this.selectedElementIndex = newPosition;
      this.view.selectElement(this.selectedElementIndex);
      this.view.scrollToRow(row, true, function() {

        if (row + 1 === maxRows) {
          self.getMorePhotos();
        } else if (moveUp && row === 1 && self.page !== 1) {
          self.backToOldPhotos();
        }
      });
    }
  };

  window.App = function(params) {

    params = params || {};

    var model = new Model(params.apiUrl, params.secret);
    var view = new View({
      rootElement: params.rootElement,
      imgHeight: params.imgHeight
    });
    return new Controller(view, model);
  };

})(window);

var app = new App({
  apiUrl: 'https://api.flickr.com/services/rest/',
  secret: 'bde8d7724318c876c5f974772dc62e31',
  rootElement: document.getElementById('app'),
  imgHeight: 366
});
