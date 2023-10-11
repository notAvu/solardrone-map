import './style.css';
import GeoTIFF from 'ol/source/GeoTIFF.js';
import Map from 'ol/Map.js';
import OSM from 'ol/source/OSM.js';
import Overlay from 'ol/Overlay.js';
import Projection from 'ol/proj/Projection.js';
import MousePosition from 'ol/control/MousePosition.js';
import { createStringXY } from 'ol/coordinate.js';
import { defaults as defaultControls } from 'ol/control.js';
import TileLayer from 'ol/layer/WebGLTile.js';
import View from 'ol/View.js';
import Point from 'ol/geom/Point.js';
import Feature from 'ol/Feature.js';
import { Icon, Style } from 'ol/style.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import {Modify} from 'ol/interaction.js';

class Spot{
  constructor(id, coordinates ,label=""){
      this.id= id;
      this.coordinates = coordinates;
      this.label = label;
  }
  getCoordinates() {
      return this.coordinates;
  }
  getId(){
      return this.id;
  }
  /**Generates a dictionary with the data of a spot in the format the API needs it */
  getSpotDict(){
    var dict = {
      'CoordX' : this.coordinates[0],
      'CoordY' : this.coordinates[1],
      'ID':this.id,
        'label':this.label
    };
    return dict;
}
} 
/**
 * Executes a call to the spots API to get all the spots stored and load them into the map
 */
function getSpots(){
  let spotsResult;
  var xhttp = new XMLHttpRequest();
  xhttp.open("GET", "https://cors-anywhere.herokuapp.com/https://dotted-weaver-401511.ew.r.appspot.com/spots" );
  xhttp.onreadystatechange = function() {
    console.log('ApiCall')
    if (this.readyState == 4 && this.status == 200) {
      spotsResult = JSON.parse(this.responseText);
      console.log(spotsResult);
      loadSpots(spotsResult)
    }
    else{console.log(this.readyState+"||"+this.status)}
  };
  xhttp.setRequestHeader("Content-type", "application/json"); 
  xhttp.send();
  return spotsResult; 
}
/**
  A function that converts coordinates from ESPG:3857 to ESPG:4326 
  Parameters: coord -> int[2]: an array containing X and Y coordinates
  */
function epsg3857toEpsg4326(coord) {
  const convertValue = 20037508.34;
  let x = coord[0];
  let y = coord[1];
  x = (x * 180) / convertValue;
  y = (y * 180) / convertValue;
  y = (Math.atan(Math.pow(Math.E, y * (Math.PI / 180))) * 360) / Math.PI - 90;
  return [x, y];
}
/**
  A function that converts coordinates from ESPG:4326 to ESPG:3857 
  Parameters: coord -> int[2]: an array containing X and Y coordinates
  */
function epsg4326toEpsg3857(coordinates) {
  let x = coordinates[0];
  let y = coordinates[1];
  x = (coordinates[0] * 20037508.34) / 180;
  y =
    Math.log(Math.tan(((90 + coordinates[1]) * Math.PI) / 360)) /
    (Math.PI / 180);
  y = (y * 20037508.34) / 180;
  return [x, y];
}
var spotList;
/**
 * Auxiliary function that generates spots on the map given a list with their data
 */
function loadSpots(list){
  spotList = list
  console.log(spotList[0])
  for (var s of spotList) {
    console.log(s)
    var coord = [s.CoordX, s.CoordY];
    const newIcon = new Feature({
      geometry: new Point(coord),
      name: s.ID,
    });
    newIcon.setStyle(markerStyle);
    vectorSource.addFeature(newIcon);
  } 
}

const mousePositionControl = new MousePosition({
  coordinateFormat: createStringXY(6),
  // projection: 'EPSG:3857',
  projection: 'EPSG:3857',
});


let vectorSource = new VectorSource();
const baseMapLayer = new TileLayer({ source: new OSM() })
const markerStyle = new Style({
  image: new Icon({
    anchor: [0.5, 1],
    anchorXUnits: 'fraction',
    anchorYUnits: 'fraction',
    src: '/Images/Map_pin_icon.png',
    scale: 0.02
  }),
});
const vectorLayer = new VectorLayer({
  source: vectorSource
});

var map = new Map({
  controls: defaultControls().extend([mousePositionControl]),
  target: 'map',
  layers: [baseMapLayer, vectorLayer],
  view: new View({
    center: [0, 0],
    zoom: 2,
  }),
});


const popupElement = document.getElementById('popup');
const popup = new Overlay({
  element: popupElement,
  positioning: 'bottom-center',
  stopEvent: false,
});
let popover;
function disposePopover() {
  if (popover) {
    popover.dispose(); 
    popover = undefined;
  }
}
let selectedPointId;
let selectedPoint; 
map.on('click', function (evt) {
  const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
    return feature;
  });
  disposePopover();
  if (feature) {
    if(popupElement.style.display == 'none'){
      popupElement.style.display = "block";
      //TODO: enable delete button
    }
    console.log(feature.values_.name);
    selectedPointId = feature.values_.name;
    selectedPoint = feature;
    popup.setPosition(evt.coordinate);
    // var fixedCoord = epsg3857toEpsg4326(evt.coordinate)
    var fixedCoord = evt.coordinate
    var coordText = document.getElementById('point-coordinates');
    coordText.innerHTML = fixedCoord[0]+" X, "+fixedCoord[1]+" Y"
    popover = new bootstrap.Popover(popupElement, {
      placement: 'top',
      html: true,
    });
    popover.show();
  }
});
map.addOverlay(popup);
map.on('movestart', disposePopover);

/**
 * A function that sends a given spot's data to the API 
 */
function postSpotAPI(spot){
  var body = JSON.stringify(spot);
  console.log(body);
  var xhttp = new XMLHttpRequest();
  xhttp.open("POST", "https://cors-anywhere.herokuapp.com/https://dotted-weaver-401511.ew.r.appspot.com/spots" );
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      console.log('Spot inserted')
    }
    else{console.log("error: "+this.status)}
  };
  xhttp.setRequestHeader("Content-type", "application/json"); 
  xhttp.send(body);
}
map.on('click', function (evt) {
  let coordinate = evt.coordinate;
  if (addButtonActive) {
    let lastId;
    let newIcon;
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", "https://cors-anywhere.herokuapp.com/https://dotted-weaver-401511.ew.r.appspot.com/spots/last" );
    xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        lastId = JSON.parse(this.responseText)[0]["MAX(ID)"];
        
        let spot = new Spot(lastId+1, coordinate);
         newIcon = new Feature({
          geometry: new Point(coordinate),
          name: lastId+1,
        });
        newIcon.setStyle(markerStyle);
    vectorSource.addFeature(newIcon);
        postSpotAPI(spot.getSpotDict());
      }
    };
    console.log(newIcon)
    xhttp.send();
    addButtonActive = false;
  }
});
getSpots();
const modify = new Modify({
  hitDetection: vectorLayer,
  source: vectorSource,
});
modify.on(['modifyend'], function (evt) {
  var feature = evt.features.array_['0'];
  let modId = feature.values_.name
  let coordinate = evt.features.getArray()[0].geometryChangeKey_.target.flatCoordinates;
  let spot = new Spot(modId, coordinate);
  let body = spot.getSpotDict();
  var xhttp = new XMLHttpRequest();
  xhttp.open("PUT", "https://cors-anywhere.herokuapp.com/https://dotted-weaver-401511.ew.r.appspot.com/spots" );
    xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        console.log(modId+" new position "+coordinate)
      }else{
        console.log('error'+this.status);
      }
    };
    xhttp.setRequestHeader("Content-type", "application/json"); 
    xhttp.send(JSON.stringify(body));
});

  map.addInteraction(modify);
  
  const closeButton = document.getElementById('close-button');
  closeButton.addEventListener('click', closePopover);
  const deleteButton = document.getElementById('deleteButton');
  deleteButton.addEventListener('click', deleteSpot);
  const uploadButton = document.getElementById('uploadFile');
  uploadButton.addEventListener('change', addGeotiffLayer);
  const addPointButton = document.getElementById('addPoint');
  addPointButton.addEventListener('click', addButtonClick);
  
  function closePopover(){
    popupElement.style.display = 'none';
  }
  var addButtonActive = false;

  //Deletes the point whose popover is currently being shown
  function deleteSpot(){
    let id = selectedPointId;
    if(id >=0){

      var xhttp = new XMLHttpRequest();
      xhttp.open("DELETE", "https://cors-anywhere.herokuapp.com/https://dotted-weaver-401511.ew.r.appspot.com/spots/"+id );
      xhttp.onreadystatechange = function() {
        if(this.status == 200 && this.readyState == 4){
          console.log('delete'+ selectedPoint);
          vectorLayer.getSource().removeFeature(selectedPoint);
        }
      };
      xhttp.setRequestHeader("Content-type", "application/json"); 
      xhttp.send();
    }
  }
  /**
   * Generates a new layer in which the uploaded geotiff file will be projected
   */
  function addGeotiffLayer() {
    var geotiffFile = uploadButton.files[0];
    var fileUrl = URL.createObjectURL(geotiffFile);
    var geotiffLayer;
    fetch(fileUrl)
    .then((response) => response.blob())
    .then((blob) => {
      const geotiffSource = new GeoTIFF({
        sources: [
          {
            blob: blob,
          },
        ],
        convertToRGB: true,
      });
      geotiffLayer = new TileLayer({ source: geotiffSource, });
      map.getLayers().insertAt(1, geotiffLayer);
    });
  }
  function addButtonClick() {
    addButtonActive = true;
  }
  