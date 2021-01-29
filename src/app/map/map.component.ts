import { Component, OnInit } from '@angular/core';
import * as esriVector from 'esri-leaflet-vector';
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
    const vectorTileLayer = esriVector.vectorTileLayer('018ac5f6efbb4dc98c7239f58476b7de');
    map.addLayer(vectorTileLayer);
  }

}
