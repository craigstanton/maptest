/* esri-leaflet-vector - v2.0.1 - Fri Jan 22 2021 10:21:35 GMT+1300 (New Zealand Daylight Time)
 * Copyright (c) 2021 Environmental Systems Research Institute, Inc.
 * Apache-2.0 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('leaflet'), require('mapbox-gl'), require('esri-leaflet')) :
  typeof define === 'function' && define.amd ? define(['exports', 'leaflet', 'mapbox-gl', 'esri-leaflet'], factory) :
  (factory((global.L = global.L || {}, global.L.esri = global.L.esri || {}, global.L.esri.Vector = {}),global.L,global.mapboxgl,global.L.esri));
}(this, (function (exports,L,mapboxGl,esriLeaflet) { 'use strict';

  L = L && L.hasOwnProperty('default') ? L['default'] : L;

  var version = "2.0.1";

  (function (root, factory) {
      if (typeof define === 'function' && define.amd) {
          // AMD
          define(['leaflet', 'mapbox-gl'], factory);
      } else if (typeof exports === 'object') {
          // Node, CommonJS-like
          module.exports = factory(require('leaflet'), require('mapbox-gl'));
      } else {
          // Browser globals (root is window)
          root.returnExports = factory(window.L, window.mapboxgl);
      }
  }(undefined, function (L$$1, mapboxgl) {
      L$$1.MapboxGL = L$$1.Layer.extend({
              options: {
              updateInterval: 32,
              // How much to extend the overlay view (relative to map size)
              // e.g. 0.1 would be 10% of map view in each direction
              padding: 0.1,
              // whether or not to register the mouse and keyboard
              // events on the mapbox overlay
              interactive: false,
              // set the tilepane as the default pane to draw gl tiles
              pane: 'tilePane'
          },

          initialize: function (options) {
              L$$1.setOptions(this, options);

              if (options.accessToken) {
                  mapboxgl.accessToken = options.accessToken;
              }

              // setup throttling the update event when panning
              this._throttledUpdate = L$$1.Util.throttle(this._update, this.options.updateInterval, this);
          },

          onAdd: function (map) {
              if (!this._container) {
                  this._initContainer();
              }

              var paneName = this.getPaneName();
              map.getPane(paneName).appendChild(this._container);
              
              this._initGL();

              this._offset = this._map.containerPointToLayerPoint([0, 0]);

              // work around https://github.com/mapbox/mapbox-gl-leaflet/issues/47
              if (map.options.zoomAnimation) {
                  L$$1.DomEvent.on(map._proxy, L$$1.DomUtil.TRANSITION_END, this._transitionEnd, this);
              }
          },

          onRemove: function (map) {
              if (this._map._proxy && this._map.options.zoomAnimation) {
                  L$$1.DomEvent.off(this._map._proxy, L$$1.DomUtil.TRANSITION_END, this._transitionEnd, this);
              }
              var paneName = this.getPaneName();
              map.getPane(paneName).removeChild(this._container);
              
              this._glMap.remove();
              this._glMap = null;
          },

          getEvents: function () {
              return {
                  move: this._throttledUpdate, // sensibly throttle updating while panning
                  zoomanim: this._animateZoom, // applys the zoom animation to the <canvas>
                  zoom: this._pinchZoom, // animate every zoom event for smoother pinch-zooming
                  zoomstart: this._zoomStart, // flag starting a zoom to disable panning
                  zoomend: this._zoomEnd,
                  resize: this._resize
              };
          },

          getMapboxMap: function () {
              return this._glMap;
          },

          getCanvas: function () {
              return this._glMap.getCanvas();
          },

          getSize: function () {
              return this._map.getSize().multiplyBy(1 + this.options.padding * 2);
          },

          getBounds: function () {
              var halfSize = this.getSize().multiplyBy(0.5);
              var center = this._map.latLngToContainerPoint(this._map.getCenter());
              return L$$1.latLngBounds(
                  this._map.containerPointToLatLng(center.subtract(halfSize)),
                  this._map.containerPointToLatLng(center.add(halfSize))
              );
          },

          getContainer: function () {
              return this._container;
          },
          
          // returns the pane name set in options if it is a valid pane, defaults to tilePane
          getPaneName: function () {
              return this._map.getPane(this.options.pane) ? this.options.pane : 'tilePane'; 
          },
          
          _initContainer: function () {
              var container = this._container = L$$1.DomUtil.create('div', 'leaflet-gl-layer');

              var size = this.getSize();
              var offset = this._map.getSize().multiplyBy(this.options.padding);
              container.style.width  = size.x + 'px';
              container.style.height = size.y + 'px';

              var topLeft = this._map.containerPointToLayerPoint([0, 0]).subtract(offset);

              L$$1.DomUtil.setPosition(container, topLeft);
          },

          _initGL: function () {
              var center = this._map.getCenter();

              var options = L$$1.extend({}, this.options, {
                  container: this._container,
                  center: [center.lng, center.lat],
                  zoom: this._map.getZoom() - 1,
                  attributionControl: false
              });

              this._glMap = new mapboxgl.Map(options);

              // allow GL base map to pan beyond min/max latitudes
              this._glMap.transform.latRange = null;
              this._transformGL(this._glMap);

              if (this._glMap._canvas.canvas) {
                  // older versions of mapbox-gl surfaced the canvas differently
                  this._glMap._actualCanvas = this._glMap._canvas.canvas;
              } else {
                  this._glMap._actualCanvas = this._glMap._canvas;
              }

              // treat child <canvas> element like L.ImageOverlay
              var canvas = this._glMap._actualCanvas;
              L$$1.DomUtil.addClass(canvas, 'leaflet-image-layer');
              L$$1.DomUtil.addClass(canvas, 'leaflet-zoom-animated');
              if (this.options.interactive) {
                  L$$1.DomUtil.addClass(canvas, 'leaflet-interactive');
              }
              if (this.options.className) {
                  L$$1.DomUtil.addClass(canvas, this.options.className);
              }
          },

          _update: function (e) {
              // update the offset so we can correct for it later when we zoom
              this._offset = this._map.containerPointToLayerPoint([0, 0]);

              if (this._zooming) {
                  return;
              }

              var size = this.getSize(),
                  container = this._container,
                  gl = this._glMap,
                  offset = this._map.getSize().multiplyBy(this.options.padding),
                  topLeft = this._map.containerPointToLayerPoint([0, 0]).subtract(offset);

              L$$1.DomUtil.setPosition(container, topLeft);

              this._transformGL(gl);

              if (gl.transform.width !== size.x || gl.transform.height !== size.y) {
                  container.style.width  = size.x + 'px';
                  container.style.height = size.y + 'px';
                  if (gl._resize !== null && gl._resize !== undefined){
                      gl._resize();
                  } else {
                      gl.resize();
                  }
              } else {
                  // older versions of mapbox-gl surfaced update publicly
                  if (gl._update !== null && gl._update !== undefined){
                      gl._update();
                  } else {
                      gl.update();
                  }
              }
          },

          _transformGL: function (gl) {
              var center = this._map.getCenter();

              // gl.setView([center.lat, center.lng], this._map.getZoom() - 1, 0);
              // calling setView directly causes sync issues because it uses requestAnimFrame

              var tr = gl.transform;
              tr.center = mapboxgl.LngLat.convert([center.lng, center.lat]);
              tr.zoom = this._map.getZoom() - 1;
          },

          // update the map constantly during a pinch zoom
          _pinchZoom: function (e) {
              this._glMap.jumpTo({
                  zoom: this._map.getZoom() - 1,
                  center: this._map.getCenter()
              });
          },

          // borrowed from L.ImageOverlay
          // https://github.com/Leaflet/Leaflet/blob/master/src/layer/ImageOverlay.js#L139-L144
          _animateZoom: function (e) {
              var scale = this._map.getZoomScale(e.zoom);
              var padding = this._map.getSize().multiplyBy(this.options.padding * scale);
              var viewHalf = this.getSize()._divideBy(2);
              // corrections for padding (scaled), adapted from
              // https://github.com/Leaflet/Leaflet/blob/master/src/map/Map.js#L1490-L1508
              var topLeft = this._map.project(e.center, e.zoom)
                  ._subtract(viewHalf)
                  ._add(this._map._getMapPanePos()
                  .add(padding))._round();
              var offset = this._map.project(this._map.getBounds().getNorthWest(), e.zoom)
                  ._subtract(topLeft);

              L$$1.DomUtil.setTransform(
                  this._glMap._actualCanvas,
                  offset.subtract(this._offset),
                  scale
              );
          },

          _zoomStart: function (e) {
              this._zooming = true;
          },

          _zoomEnd: function () {
              var scale = this._map.getZoomScale(this._map.getZoom());

              L$$1.DomUtil.setTransform(
                  this._glMap._actualCanvas,
                  // https://github.com/mapbox/mapbox-gl-leaflet/pull/130
                  null,
                  scale
              );

              this._zooming = false;

              this._update();
          },

          _transitionEnd: function (e) {
              L$$1.Util.requestAnimFrame(function () {
                  var zoom = this._map.getZoom();
                  var center = this._map.getCenter();
                  var offset = this._map.latLngToContainerPoint(
                      this._map.getBounds().getNorthWest()
                  );

                  // reset the scale and offset
                  L$$1.DomUtil.setTransform(this._glMap._actualCanvas, offset, 1);

                  // enable panning once the gl map is ready again
                  this._glMap.once('moveend', L$$1.Util.bind(function () {
                      this._zoomEnd();
                  }, this));

                  // update the map position
                  this._glMap.jumpTo({
                      center: center,
                      zoom: zoom - 1
                  });
              }, this);
          },

          _resize: function (e) {
              this._transitionEnd(e);
          }
      });

      L$$1.mapboxGL = function (options) {
          return new L$$1.MapboxGL(options);
      };

  }));

  function fetchMetadata (url, context) {
    esriLeaflet.request(url, {}, function (error, style) {
      if (!error) {
        esriLeaflet.request(style.sources.esri.url, {}, function (error, tileMetadata) {
          if (!error) {
            formatStyle(style, tileMetadata, url);
            context._mapboxGL = L.mapboxGL({
              accessToken: 'ezree',
              style: style
            });

            context._ready = true;
            context.fire('ready', {}, true);
          }
        }, context);
      } else {
        throw new Error('Unable to fetch vector tile style metadata');
      }
    }, context);
  }

  function formatStyle (style, metadata, styleUrl) {
    // if a relative path is referenced, the default style can be found in a standard location
    if (style.sources.esri.url && style.sources.esri.url.indexOf('http') === -1) {
      style.sources.esri.url = styleUrl.replace('/resources/styles/root.json', '');
    }

    // right now ArcGIS Pro published vector services have a slightly different signature
    if (metadata.tiles && metadata.tiles[0].charAt(0) !== '/') {
      metadata.tiles[0] = '/' + metadata.tiles[0];
    }

    if (metadata.tileMap && metadata.tileMap.charAt(0) !== '/') {
      metadata.tileMap = '/' + metadata.tileMap;
    }

    style.sources.esri = {
      type: 'vector',
      scheme: 'xyz',
      tilejson: metadata.tilejson || '2.0.0',
      format: (metadata.tileInfo && metadata.tileInfo.format) || 'pbf',
      index: metadata.tileMap ? style.sources.esri.url + metadata.tileMap : null,
      tiles: [
        style.sources.esri.url + metadata.tiles[0]
      ],
      description: metadata.description,
      name: metadata.name,
      /* mapbox-gl-js does not respect the indexing of esri tiles
      because we cache to different zoom levels depending on feature density. articifially capping at 15, but 404s will still be encountered when zooming in tight in rural areas.

      the *real* solution would be to make intermittent calls to our tilemap and update the maxzoom of the layer internally.

      reference implementation: https://github.com/openstreetmap/iD/pull/5029
      */
      maxzoom: 15
    };

    if (style.glyphs.indexOf('http') === -1) {
      // set paths to sprite and glyphs
      style.glyphs = styleUrl.replace('styles/root.json', style.glyphs.replace('../', ''));
      style.sprite = styleUrl.replace('styles/root.json', style.sprite.replace('../', ''));
    }
  }

  var Basemap = L.Layer.extend({
    statics: {
      URLPREFIX: 'https://www.arcgis.com/sharing/rest/content/items/',
      URLSUFFIX: '/resources/styles/root.json',
      STYLES: {
        'OpenStreetMap': '3e1a00aeae81496587988075fe529f71',
        // v2
        'Streets': 'de26a3cf4cc9451298ea173c4b324736',
        'StreetsRelief': 'b266e6d17fc345b498345613930fbd76',
        // 7dc6cea0b1764a1f9af2e679f642f0f5 doesnt pass validation
        'Topographic': '7a6bf0e8cb5a418085e66c0485e74d19',
        // 86f556a2d1fd468181855a35e344567f doesnt pass validation
        'StreetsNight': '93554006894c45a88136127535878fca',
        'Newspaper': 'dfb04de5f3144a80bc3f9f336228d24a',
        'Navigation': '63c47b7177f946b49902c24129b87252',
        'Nova': '75f4dfdff19e445395653121a95a85db',
        'ColoredPencil': '4cf7e1fb9f254dcda9c8fbadb15cf0f8',
        'Hybrid': '30d6b8271e1849cd9c3042060001f425',
        'Gray': '291da5eab3a0412593b66d384379f89f', // no labels
        'DarkGray': '5e9b3685f4c24d8781073dd928ebda50', // no labels
        'HumanGeography': '2afe5b807fa74006be6363fd243ffb30', // no labels
        'HumanGeographyDetail': '97fa1365da1e43eabb90d0364326bc2d', // no labels
        'DarkHumanGeography': 'd7397603e9274052808839b70812be50', // no labels
        'DarkHumanGeographyDetail': '1ddbb25aa29c4811aaadd94de469856a', // no labels
        'ChartedTerritory': '1c365daf37a744fbad748b67aa69dac8',
        'MidCentury': '7675d44bb1e4428aa2c30a9b68f97822'
        // 'ModernAntique': 'effe3475f05a4d608e66fd6eeb2113c0' // throws mismatched image size error
      }
    },

    initialize: function (options) {
      // L.Layer expects a JSON object literal to be passed in constructor
      options = {
        key: options
      };

      this._basemap = options.key;

      if (typeof options.key === 'string' && Basemap.STYLES[options.key]) {
        var url = Basemap.URLPREFIX + Basemap.STYLES[options.key] + Basemap.URLSUFFIX;
        fetchMetadata(url, this);
      } else {
        throw new Error('L.esri.Vector.Basemap: Invalid parameter. Use one of "DarkGray", "Gray", "Hybrid", "Navigation", "Streets", "StreetsNight", "StreetsRelief", "Topographic"');
      }
    },

    onAdd: function (map) {
      this._map = map;
      esriLeaflet.Util.setEsriAttribution(map);

      if (map.attributionControl) {
        if (this._basemap === 'OpenStreetMap') {
          map.attributionControl.setPrefix('<a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a>');
          map.attributionControl.addAttribution('<span class="esri-dynamic-attribution">&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, map layer by Esri</span>');
        } else {
          esriLeaflet.Util._getAttributionData('https://static.arcgis.com/attribution/World_Street_Map', map);
          map.attributionControl.addAttribution('<span class="esri-dynamic-attribution">USGS, NOAA</span>');
        }
      }

      if (this._ready) {
        this._asyncAdd();
      } else {
        this.once('ready', function () {
          this._asyncAdd();
        }, this);
      }
    },

    onRemove: function (map) {
      map.off('moveend', esriLeaflet.Util._updateMapAttribution);
      map.removeLayer(this._mapboxGL);

      if (map.attributionControl) {
        var vectorAttribution = document.getElementsByClassName('esri-dynamic-attribution')[0].outerHTML;
        // this doesn't work, not sure why.
        map.attributionControl.removeAttribution(vectorAttribution);
      }
    },

    _asyncAdd: function () {
      var map = this._map;
      // thought it was just me, but apparently its not easy to mixin two different styles
      // https://github.com/mapbox/mapbox-gl-js/issues/4000

      // set the background color of the map to the background color of the tiles
      map.getContainer().style.background = this._mapboxGL.options.style.layers[0].paint['background-color'] || '#e1e3d0';

      map.on('moveend', esriLeaflet.Util._updateMapAttribution);
      this._mapboxGL.addTo(map, this);
      // map._gl = this._mapboxGL;
    }
  });

  function basemap (key) {
    return new Basemap(key);
  }

  var Layer = L.Layer.extend({
    statics: {
      URLPREFIX: 'https://www.arcgis.com/sharing/rest/content/items/'
    },

    initialize: function (options) {
      // L.Layer expects a JSON object literal to be passed in constructor
      options = {
        id: options
      };

      if (typeof options.id === 'string') {
        var itemMetadataUrl = Layer.URLPREFIX + options.id;
        var tileUrl;

        esriLeaflet.request(itemMetadataUrl, {}, function (error, metadata) {
          if (!error) {
            tileUrl = metadata.url;

            // custom tileset published using ArcGIS Pro
            // if (tileUrl.indexOf('basemaps.arcgis.com') === -1) {
            //   this._customTileset = true;
            //   // if copyright info was published, display it.
            //   if (metadata.accessInformation) {
            //     this._copyrightText = metadata.accessInformation;
            //   }
            //   request(tileUrl, {}, function (error, tileMetadata) {
            //     if (!error) {
            //       // right now ArcGIS Pro published vector services have a slightly different signature
            //       if (tileMetadata.defaultStyles.charAt(0) !== '/') {
            //         tileMetadata.defaultStyles = '/' + tileMetadata.defaultStyles;
            //       }
  // 
            //       styleUrl = tileUrl + tileMetadata.defaultStyles + '/root.json';
            //       request(styleUrl, {}, function (error, style) {
            //         if (!error) {
            //           formatStyle(style, tileMetadata, styleUrl);
  // 
            //           this._mapboxGL = L.mapboxGL({
            //             accessToken: 'ezree',
            //             style: style
            //           });
  // 
            //           this._ready = true;
            //           this.fire('ready', {}, true);
            //         }
            //       }, this);
            //     }
            //   }, this);
            // } else {
              // custom symbology applied to hosted basemap tiles
              fetchMetadata(itemMetadataUrl + '/resources/styles/root.json', this);
            // }
          }
        }, this);
      } else {
        throw new Error('L.esri.Vector.Layer: Invalid parameter. Use the id of an ArcGIS Online vector tile item');
      }
    },

    onAdd: function (map) {
      this._map = map;
      esriLeaflet.Util.setEsriAttribution(map);

      if (this._ready) {
        this._asyncAdd();
      } else {
        this.once('ready', function () {
          this._asyncAdd();
        }, this);
      }
    },

    onRemove: function (map) {
      map.off('moveend', esriLeaflet.Util._updateMapAttribution);
      map.removeLayer(this._mapboxGL);

      if (map.attributionControl) {
        var vectorAttribution = document.getElementsByClassName('esri-dynamic-attribution')[0].outerHTML;
        // this doesn't work, not sure why.
        map.attributionControl.removeAttribution(vectorAttribution);
      }
    },

    _asyncAdd: function () {
      var map = this._map;
      if (map.attributionControl) {
        if (this._customTileset) {
          if (this._copyrightText) {
            // pull static copyright text for services published with Pro
            map.attributionControl.addAttribution('<span class="esri-dynamic-attribution">' + this._copyrightText + '</span>');
          }
        } else {
          // provide dynamic attribution for Esri basemaps
          esriLeaflet.Util._getAttributionData('https://static.arcgis.com/attribution/World_Street_Map', map);
          map.attributionControl.addAttribution('<span class="esri-dynamic-attribution">USGS, NOAA</span>');
          map.on('moveend', esriLeaflet.Util._updateMapAttribution);
        }
      }

      // set the background color of the map to the background color of the tiles
      map.getContainer().style.background = this._mapboxGL.options.style.layers[0].paint['background-color'];
      this._mapboxGL.addTo(map, this);
    }
  });

  function layer (id) {
    return new Layer(id);
  }

  exports.VERSION = version;
  exports.Basemap = Basemap;
  exports.basemap = basemap;
  exports.Layer = Layer;
  exports.layer = layer;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=esri-leaflet-vector-debug.js.map
