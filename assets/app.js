
(function(window) {


  /** BASE MODEL **/


  var Model = function(apiUrl, apiKey) {

    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  };


  /**
   * Simple wrapper under XHR
   *
   * @param {String} path
   * @callback
   */
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


  /**
   * Returns list of photo src
   *
   * @param {Object} params
   * @param {Number} params.page
   * @param {Number} params.perPage - count of items on one page
   * @callback
   */
  Model.prototype.getPhotoLinks = function(params, callback) {

    callback = typeof callback === 'function' ? callback : function() {};

    var query = {
      method: 'flickr.photos.getRecent',
      api_key: this.apiKey,
      page: params ? params.page : 1,
      per_page: params ? params.perPage: 50,
      extras: 'url_o,url_m',
      format: 'json',
      nojsoncallback: 1
    };

    var queryString = Object.keys(query).map(function(key) {

      return key + '=' + query[key];
    }).join('&');

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


  /** BASE VIEW **/


  var View = function(params) {

    params = params || {};

    this.rootElement = params.rootElement;
    this.imgHeight = params.imgHeight || 180;
    this.container = document.createElement('div');
    this.container.className = 'container';
    this.rootElement.appendChild(this.container);
    // Events
    this.onWheel = function() {};
    this.onKeyDown = function() {};

    this.rootElement.addEventListener('wheel', this.onWheel);
  };


  /**
   * It select element on page by index (node number)
   *
   * @param {Number} index
   */
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


  /**
   * Scroll view to the specify row
   *
   * @param {Number} row
   * @param {Boolean} animate - allow to use smooth scroll
   * @callback
   */
  View.prototype.scrollToRow = function(row, animate, callback) {

    // Scroll on center position;
    var multiplier = row - 1.5;
    // Img height + margin
    var heightWithMargin = this.imgHeight + 44;
    // Get start position from DOM Node
    var startPosition = parseInt(this.container.style.top.replace('px', '') || 0);
    // Set finalpostion as negative height (or zero)
    var finalPosition = row < 2 ? 0 : -(heightWithMargin * multiplier);
    // Use down below in interval
    var currentPosition = startPosition;

    if (!animate) {
      this.container.style.top = finalPosition + 'px';
      return;
    }

    var perStep = (finalPosition - startPosition) / 6;
    var counter = 0;

    var timer = setInterval(function() {

      if (counter >= 6) {
        typeof callback == 'function' ? callback() : null;
        return clearInterval(timer);
      }

      currentPosition += perStep;
      this.container.style.top = currentPosition + 'px';
      counter++;
    }.bind(this), 30);
  }


  /**
   * It inset new images at start or end of existing images
   *
   * @param {String[]} links
   * @param {Boolean} insertAfter
   */
  View.prototype.render = function(links, insertAfter) {

    var self = this;
    // Create Node fragment for optimization purposes
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


  /**
   * Remove existing images from DOM
   *
   * @param {Number} count
   * @param {Boolean} fromStart - allow to choose strategy (from start or end of list)
   */
  View.prototype.removeElements = function(count, fromStart) {

    var elements = document.querySelectorAll('.photo-container');
    var maxIndex = elements.length - 1;
    var i = fromStart ? 0 : maxIndex;
    var step = fromStart ? 1 : -1;

    while (fromStart ? i < count : i > (maxIndex - count)) {
      elements[i].remove();
      i += step;
    }
  };


  /** BASE CONTROLLER **/


  var Controller = function(view, model) {

    this.view = view;
    this.model = model;
    this.photosInRow = 5;
    this.photoPerPage = 50;
    this.availableOffset = 15;
    this.page = 1;
    this.photoLinks = [];
    this.selectedElementIndex = 0;
    this._onWheel = false;
    this._onRequest = false;
    this.initialize();
  };


  /**
   * Init all handkers and get first data
   */
  Controller.prototype.initialize = function() {

    this.model.getPhotoLinks({ page: this.page, perPage: this.photoPerPage}, function(err, links) {

      if (err) {
        return err;
      }

      this.photoLinks = this.photoLinks.concat(links);
      this.view.render(this.photoLinks.slice(-this.photoPerPage), true);
      this.view.selectElement(this.selectedElementIndex);
      this.view.scrollToRow(1);
    }.bind(this));

    this.view.rootElement.addEventListener('wheel', this.onWheel.bind(this));
    this.view.onWheel = this.onWheel.bind(this);

    document.addEventListener('keyup', this.onKeyUp.bind(this));
  };


  /**
   * Mouse wheel Handler
   *
   * @param {Object} event - Standart DOM Node event
   */
  Controller.prototype.onWheel = function(event) {

    // If it already wait - do nothing
    if (this._onWheel) {
      return false;
    }

    this._onWheel = true;

    this.moveSelectElement(event.deltaY > 0 ? this.photosInRow : -this.photosInRow, function() {

      this._onWheel = false;
    }.bind(this));
  };


  /**
   * KeyBoard Handler
   *
   * @param {Object} event - Standart DOM Node event
   */
  Controller.prototype.onKeyUp = function(event) {

    switch (event.keyCode) {
    // left arrow
    case 37:
      this.moveSelectElement(-1);
      break;
    // up arrow
    case 38:
      this.moveSelectElement(-this.photosInRow);
      break;
    // right arrow
    case 39:
      this.moveSelectElement(1);
      break;
    // down arrow
    case 40:
      this.moveSelectElement(this.photosInRow);
      break;
    }
  };

  /**
   * Load extra photo
   */
  Controller.prototype.getMorePhotos = function() {

    // If it already working - do nothing
    if (this._onRequest) {
      return;
    }

    var newPage = this.page + 1;

    var startIndex = this.page * this.photoPerPage;
    var endIndex = startIndex + (this.photoPerPage - this.availableOffset);

    // Check chache
    if (endIndex < this.photoLinks.length) {

      this.selectedElementIndex = (this.selectedElementIndex % this.photosInRow) + this.photosInRow;
      this.view.removeElements(this.photoPerPage - this.availableOffset, true);
      this.view.render(this.photoLinks.slice(startIndex, endIndex), true);
      this.view.selectElement(this.selectedElementIndex);
      this.view.scrollToRow(2);
      this.page = newPage;
      return;
    }

    this._onRequest = true;

    this.model.getPhotoLinks({ page: newPage, perPage: this.photoPerPage }, function(err, links) {

      this._onRequest = false;

      if (err) {
        return err;
      }

      this.page = newPage;
      this.photoLinks = this.photoLinks.concat(links);
      this.selectedElementIndex = (this.selectedElementIndex % this.photosInRow) + this.photosInRow;
      this.view.removeElements(this.photoPerPage - this.availableOffset, true);
      this.view.render(this.photoLinks.slice(startIndex, endIndex), true);
      this.view.selectElement(this.selectedElementIndex);
      this.view.scrollToRow(2);
    }.bind(this));
  };


  /**
   * Get photos from photoLinks property
   */
  Controller.prototype.getCachedPhotos = function() {

    var newPage = this.page - 1;
    var startIndex = (newPage - 1) * this.photoPerPage;
    var endIndex = startIndex + (this.photoPerPage - this.availableOffset);

    this.selectedElementIndex = (this.selectedElementIndex % this.photosInRow) + (this.photoPerPage - this.availableOffset);

    this.view.removeElements(this.photoPerPage - this.availableOffset, false);
    this.view.render(this.photoLinks.slice(startIndex, endIndex), false);
    this.view.selectElement(this.selectedElementIndex);
    this.view.scrollToRow(8);
    this.page = newPage;
  };


  /**
   * Move selection element by step
   *
   * @param {Number} step
   * @callback
   */
  Controller.prototype.moveSelectElement = function(step, callback) {

    // If it permorm http (getting new photos) - do nothing
    if (this._onRequest) {
      return;
    }

    var self = this;
    var newPosition = this.selectedElementIndex + step;
    var allPhotoLinksLength = this.photoLinks.length;
    var maxRows = Math.floor(this.photoPerPage / this.photosInRow);
    // Count current row (start from one)
    var row = Math.floor(newPosition / this.photosInRow) + 1;
    // Calculate old and new row number and setup current moving direction
    var moveUp = row - (Math.floor(this.selectedElementIndex / this.photosInRow) + 1) === -1;

    if (newPosition < 0) {
      return;
    }

    if (newPosition <= (allPhotoLinksLength - 1)) {
      this.selectedElementIndex = newPosition;
      this.view.selectElement(this.selectedElementIndex);
      this.view.scrollToRow(row, true, function() {

        // If it's pre last row
        if (row + 1 === maxRows) {
          self.getMorePhotos();
          // if first row, but we have some cache
        } else if (moveUp && row === 1 && self.page !== 1) {
          self.getCachedPhotos();
        }
        typeof callback === 'function' ? callback() : null;
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
