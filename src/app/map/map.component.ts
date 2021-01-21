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
    // my working map
    // const vectorTileLayer = esriVector.layer('b8cccf2315944c0c885e3150294067f2');
    // other stuff
    // const vectorTileLayer = esriVector.layer('573ba47eb6894cd6a4353799382fdd1d');
    const vectorTileLayer = esriVector.layer('30e465e2b5164dcb9a5b9f784c2baffc');
    map.addLayer(vectorTileLayer);
  }

}
