import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import * as L from 'leaflet';
import * as esri from 'esri-leaflet';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit  {
  title = 'maptest';

  @ViewChild('parkmap', {static: true}) mapContainer;
  private map;

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {

    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: false, tileSize: 512, zoomOffset: -1,
    }).setView([-40.75, 175.23], 5);

    esri.basemapLayer('Topographic', {
      detectRetina: true
    }).addTo(this.map);

  }
}
