import { Component, OnInit } from '@angular/core';
// import * as esriVector from 'esri-leaflet-vector';
import * as esriVector from '../../esri-leaflet-vector/esri-leaflet-vector.js';
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
    console.log(esriVector);
    const vectorTileLayer = esriVector.layer('b8cccf2315944c0c885e3150294067f2');
    map.addLayer(vectorTileLayer);
  }

}
