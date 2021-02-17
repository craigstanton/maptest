import { Component, OnInit } from '@angular/core';
import * as esriVector from 'esri-leaflet-vector';
import * as esriLeaflet from 'esri-leaflet';
import * as L from 'leaflet';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {

  constructor() { }

  ngOnInit() {
    const map = L.map('map').setView([-41.09, 174.88], 5);
    // hillshade
    var hillshadeLayer = esriLeaflet.tiledMapLayer({
      url: 'https://server.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer',
      maxNativeZoom: 13
    });
    hillshadeLayer.addTo(map);
    // raster toplevel
    var rasterBasemap = esriLeaflet.tiledMapLayer({
      url: 'https://tiles.arcgis.com/tiles/hLRlshaEMEYQG5A8/arcgis/rest/services/niwa_png_nz_0_13_v2/MapServer',
      maxZoom: 13
    });
    rasterBasemap.addTo(map);
    // vector detailed
    var vectorBasemap = esriVector.vectorTileLayer('93b8c97a705340fc8c12ec0c2ab95379', {minZoom: 13});
    // vectorBasemap.addTo(map);
    map.on('zoomend', function () {
      var zoomLevel = map.getZoom();
      console.log(`zoom is ${zoomLevel}`);
      if (zoomLevel >= 13) {
        if (!map.hasLayer(vectorBasemap)){
          console.log('adding layer');
          vectorBasemap.addTo(map);
        }
      }
      else {
        if (map.hasLayer(vectorBasemap)) {
          console.log('removing layer');
          vectorBasemap.remove();
        }
      }
    })
  }

}
