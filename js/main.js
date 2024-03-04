
// assign the access token
mapboxgl.accessToken =
    'pk.eyJ1IjoiZWhsNyIsImEiOiJjbG9vdHd5c3gwMWttMmpuMGp4ZWxlamUzIn0.wYyVzZnzVph_EMghQUhLWQ';

// declare the map object
let map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/mapbox/dark-v10',
    zoom: 10.5, // starting zoom
    minZoom: 5,
    center: [-122.46, 47.62] // starting center
});

const units = [1, 10, 50, 100, 200, 300],
    colors = ['#feebe2', '#fcc5c0', '#fa9fb5', '#f768a1', '#c51b8a', '#7a0177'],
    radii = [2, 5, 10, 8, 15, 20];
let yearFilter;
let typeFilter;

// define the asynchronous function to load geojson data.

async function geojsonFetch() {

    // Await operator is used to wait for a promise. 
    // An await can cause an async function to pause until a Promise is settled.
    let response;
    response = await fetch('assets/construction2023.geojson');
    permits = await response.json();


    map.on('load', () => { //simplifying the function statement: arrow with brackets to define a function
        map.addSource('permits', {
            type: 'geojson',
            data: permits,
            'attribution': '<a href="https://data-seattlecitygis.opendata.arcgis.com/datasets/2e521b98e9a84934be2815b9e15f3ff5_0/explore?location=47.585504%2C-122.107537%2C10.84">Data: Seattle GeoData</a>'
        });

        map.addLayer({
            'id': 'invis-permits',
            'type': 'circle',
            'source': 'permits',
            'paint': {'circle-opacity': 0}
        });

        map.addLayer({
            'id': 'permits-layer',
            'type': 'circle',
            'source': 'permits',
            'paint': {
                // increase the radii of the circle as the zoom level and dbh value increases
                'circle-radius': {
                    'property': 'NEW',
                    'stops': [
                        [units[0], radii[0]],
                        [units[1], radii[1]],
                        [units[2], radii[2]],
                        [units[3], radii[3]],
                        [units[4], radii[4]],
                        [units[5], radii[5]]
                    ]
                },
                // change the color of the circle as mag value increases
                'circle-color': {
                    'property': 'NEW',
                    'stops': [
                        [units[0], colors[0]],
                        [units[1], colors[1]],
                        [units[2], colors[2]],
                        [units[3], colors[3]],
                        [units[4], colors[4]],
                        [units[5], colors[5]]
                    ]
                },
                'circle-stroke-color': '#4a1486',
                'circle-stroke-width': 1,
                'circle-opacity': 0.8
            }
        });
    });

    // create legend
    const legend = document.getElementById('legend');
    //set up legend cases and labels
    var labels = ['<strong>Construction Permits - Number of Units</strong>'],
        vbreak;
    //iterate through cases and create a scaled circle and label for each
    for (var i = 0; i < units.length; i++) {
        vbreak = units[i];
        // you need to manually adjust the radius of each dot on the legend
        // in order to make sure the legend can be properly referred to the dot on the map.
        dot_radii = 2 * radii[i];
        labels.push(
            '<p class="break"><i class="dot" style="background:' + colors[i] + '; width: ' + dot_radii +
            'px; height: ' +
            dot_radii + 'px; "></i> <span class="dot-label" style="top: ' + dot_radii / 2 + 'px;">' + vbreak +
            '</span></p>');
    }

    // combine all the html codes.
    legend.innerHTML = labels.join('');

    let pieIDs;
    let loadCounter = 0;

    map.on('click', 'permits-layer', (e) => {
        new mapboxgl.Popup()
            .setLngLat(e.features[0].geometry.coordinates)
            .setHTML(`<strong>Address:</strong> ${e.features[0].properties.ADDRESS}<br><strong>Dwelling Type:</strong> ${e.features[0].properties.DWELTYPE}<br><strong>New Units:</strong> ${e.features[0].properties.NEW}<br><strong>Permit Issued:</strong> ${e.features[0].properties.ISS_DATE}`)
            .addTo(map);
    });

    let years = permitsOnScreen(permits, map.getBounds(), loadCounter);

    let x = Object.keys(years);
    x.unshift("years")
    let y = Object.values(years);
    y.unshift("permits issued")
    
    let chart = c3.generate({
        size: {
            height: 350,
            width: 460
        },
        data: {
            x: 'years',
            columns: [x, y],
            onclick: function(e) {
                yearFilter = ['==', 'YEAR_INT', e['x']];
                let filter = ['all', yearFilter];
                if (typeFilter !== undefined) {
                    filter.push(typeFilter);
                }
                map.setFilter('permits-layer', filter);
            }
        },
        bindto: "#year-chart"
    });

    let types = typesOnScreen(permits, map.getBounds(), loadCounter);
    pieIDs = Object.keys(types);
    let typeArray = [];
    for (key in types) {                
        typeArray.push(types[key]);
    }

    let chart2 = c3.generate({
        size: {
            height: 300
        },
        data: {
            columns: typeArray,
            type : 'pie',
            onclick: function(e) {
                typeFilter = ['==', 'DWELTYPE', e['id']];
                let filter = ['all', typeFilter];
                let filterCopy = filter.slice();
                if (yearFilter !== undefined) {
                    filter.push(yearFilter);
                }
                map.setFilter('invis-permits', filterCopy);
                map.setFilter('permits-layer', filter);
            }
        },
        legend: {
            show: false
        },
        bindto: '#type-chart',
    });

    //load data to the map as new layers.
    //map.on('load', function loadingData() {
    map.on('idle', () => { //simplifying the function statement: arrow with brackets to define a function
        if (loadCounter < 2) {
            loadCounter += 1;
        }
        
        let years = permitsOnScreen(permits, map.getBounds(), loadCounter);

        let x = Object.keys(years);
        x.unshift("years")
        let y = Object.values(years);
        y.unshift("permits issued")

        chart.load({
            columns: [x, y]
        });

        if (loadCounter > 1) {
            let types = typesOnScreen(permits, map.getBounds(), loadCounter);
            let typeArray = [];
            for (key in types) {                
                typeArray.push(types[key]);
            }
            chart2.unload({
                ids: pieIDs
            });
            setTimeout(function() {
                chart2.load({
                    columns: typeArray
                });
            }, 300);
            

            pieIDs = Object.keys(types);
        }
    });
}

// call the function
geojsonFetch();

function  permitsOnScreen(currentPermits, mapBounds, loadCounter) {
    let years = {
        2019: 0,
        2020: 0,
        2021: 0,
        2022: 0,
        2023: 0
    };

    let renderedPoints;
    if (loadCounter < 2) {
        renderedPoints = currentPermits.features;
    } else {
        renderedPoints = map.queryRenderedFeatures({
            layers: ['invis-permits']
        });
    }

    renderedPoints.forEach(function(e) {
        if (mapBounds.contains(e.geometry.coordinates)) {
            years[e.properties.YEAR_INT] += 1;
        }
    });

    return years;
}

function typesOnScreen(currentPermits, mapBounds, loadCounter) {
    let types = {};
    let renderedPoints;
    if (loadCounter < 2) {
        renderedPoints = currentPermits.features;
    } else {
        renderedPoints = map.queryRenderedFeatures({
            layers: ['permits-layer']
        });
    }
    
    renderedPoints.forEach(function(e) {
        if (mapBounds.contains(e.geometry.coordinates)) {
            let key = e.properties.DWELTYPE;
            if (!(types.hasOwnProperty(key))) {
                types[key] = [key, 1];
            } else {
                types[key][1] += 1;
            }
        }
    });

    return types;
}

// capture the element reset and add a click event to it.
const reset = document.getElementById('reset');
reset.addEventListener('click', event => {

    // this event will trigger the map fly to its origin location and zoom level.
    map.flyTo({
        zoom: 10.5,
        center: [-122.46, 47.62]
    });
    // also remove all the applied filters
    map.setFilter('permits-layer', null);
    map.setFilter('invis-permits', null);
    yearFilter = undefined;
    typeFilter = undefined;

});
