var HTMLMapContainer = require("./html_map_container");
var ThemesModule = require("./themes_module");
var IndoorsModule = require("./indoors_module");
var PrecacheModule = require("./precache_module");
var CameraModule = require("./camera_module");
var PolygonModule = require("./polygon_module");
var PolylineModule = require("./polyline_module");
var RoutingModule = require("./routing_module");
var RenderingModule = require("./rendering_module");
var BuildingsModule = require("./buildings_module");
var PropModule = require("./prop_module");
var IndoorMapEntityInformationModule = require("./indoor_map_entity_information_module");
var IndoorMapFloorOutlineInformationModule = require("./indoor_map_floor_outline_information_module");
var BlueSphereModule = require("./blue_sphere_module");
var MapRuntimeModule = require("./map_runtime_module");
var LayerPointMappingModule = require("./layer_point_mapping_module");
var VersionModule = require("./version_module");
var HeatmapModule = require("./heatmap_module");
var FrameRateModule = require("./frame_rate_module");

var IndoorEntranceMarkerUpdater = require("./indoor_entrance_marker_updater");

var EegeoLeafletMap = require("../public/eegeo_leaflet_map");
var MapMoveEvents = require("./events/map_move_events");

var removeFileExtension = function(fileName, extensionToRemove) {
    var extensionPosition = fileName.lastIndexOf(".");
    var extension = fileName.slice(extensionPosition);
    if (extension === extensionToRemove) {
        return fileName.slice(0, extensionPosition);
    }
    return fileName;
};


var EegeoMapController = function (mapId, emscriptenApi, domElement, apiKey, browserWindow, browserDocument, module, options, onMapRemoveCallback) {

    var _defaultOptions = {
        canvasId: "canvas",
        width: undefined,
        height: undefined,
        indoorsEnabled: false,
        displayEntranceMarkers: true,
        coverageTreeManifest: "",
        environmentThemesManifest: "",
        headingDegrees: 0,

        // Override Leaflet defaults
        center: L.latLng([37.7858, -122.401]),
        zoom: 16,
        doubleClickZoom: true,
        zoomControl: false,
        zoomAnimation: false,
        minZoom: 0,
        maxZoom: 20,
        zoomSnap: 0,

        viewVerticallyLocked: false,
        showIndoorWrldWatermark: true,
        trafficEnabled: true,
        trafficDisableWhenEnteringIndoorMaps: true,
        indoorLabelsAlwaysHidden: false,

        targetVSyncInterval: 1,
        frameRateThrottleWhenIdleEnabled: false,
        throttledTargetFrameIntervalMilliseconds: 1000,
        idleSecondsBeforeFrameRateThrottle: 30.0,

        drawClearColor: "#000000ff",
        indoorMapBackgroundColor: "#000000c0",
        indoorSelectionTimeoutDuration: 30.0
    };

    options = L.extend(_defaultOptions, options);

    var _mapId = mapId;
    var _emscriptenApi = emscriptenApi;
    var _browserWindow = browserWindow;
    var _browserDocument = browserDocument;

    var _themesModule = new ThemesModule(emscriptenApi);
    var _precacheModule = new PrecacheModule(emscriptenApi);
    var _cameraModule = new CameraModule(
        emscriptenApi,
        options.center,
        options.zoom,
        options.viewVerticallyLocked
    );
    var _indoorsModule = new IndoorsModule(emscriptenApi, this, _mapId, options.indoorId, options.floorIndex, options.center, options.headingDegrees, options.zoom, options.showIndoorWrldWatermark, options.indoorMapBackgroundColor);
    var _polygonModule = new PolygonModule(emscriptenApi);
    var _polylineModule = new PolylineModule(emscriptenApi);
    var _layerPointMappingModule = new LayerPointMappingModule(emscriptenApi);
    var _routingModule = new RoutingModule(apiKey, _indoorsModule);
    var _renderingModule = new RenderingModule(emscriptenApi, options.drawClearColor);
    var _buildingsModule = new BuildingsModule(emscriptenApi);
    var _propModule = new PropModule(emscriptenApi);
    var _indoorMapEntityInformationModule = new IndoorMapEntityInformationModule(emscriptenApi);
    var _indoorMapFloorOutlineInformationModule = new IndoorMapFloorOutlineInformationModule(emscriptenApi);
    var _blueSphereModule = new BlueSphereModule(emscriptenApi);
    var _mapRuntimeModule = new MapRuntimeModule(emscriptenApi);
    var _versionModule = new VersionModule(emscriptenApi);
    var _heatmapModule = new HeatmapModule(emscriptenApi);

    var _frameRateModule = new FrameRateModule(
        emscriptenApi,
        options.targetVSyncInterval,
        options.throttledTargetFrameIntervalMilliseconds,
        options.idleSecondsBeforeFrameRateThrottle,
        options.frameRateThrottleWhenIdleEnabled
    );

    var _onMapRemoveCallback = onMapRemoveCallback;

    var _canvasId = _mapId ? options["canvasId"] + _mapId : options["canvasId"];
    var _canvasWidth = options["width"] || domElement.clientWidth;
    var _canvasHeight = options["height"] || domElement.clientHeight;
    var _containerId = "wrld-map-container" + _mapId;

    var _mapContainer = new HTMLMapContainer(_browserDocument, _browserWindow, domElement, _canvasId, _canvasWidth, _canvasHeight, _containerId, _mapId);

    var _canvas = _mapContainer.canvas;

    var _Module = module;
    _Module["canvas"] = _canvas;

    var center = L.latLng(options.center);
    var zoom = options.zoom;
    var headingDegrees = options.headingDegrees;

    var indoorsEnabledArg = (options.indoorsEnabled) ? "1" : "0";
    var coverageTreeManifest = removeFileExtension(options.coverageTreeManifest, ".gz");
    var environmentThemesManifest = removeFileExtension(options.environmentThemesManifest, ".gz");
    var doubleClickZoom = (options.doubleClickZoom) ? "1" : "0";
    var trafficEnabled = (options.trafficEnabled) ? "1" : "0";
    var trafficDisableWhenEnteringIndoorMaps = (options.trafficDisableWhenEnteringIndoorMaps) ? "1" : "0";
    var indoorLabelsAlwaysHidden = (options.indoorLabelsAlwaysHidden) ? "1" : "0";
    var indoorSelectionTimeoutDuration = options.indoorSelectionTimeoutDuration;

    _Module["arguments"] = [
        _canvasId,
        _mapId.toString(),
        _canvasWidth.toString(),
        _canvasHeight.toString(),
        apiKey,
        center.lat.toString(),
        center.lng.toString(),
        zoom.toString(),
        headingDegrees.toString(),
        indoorsEnabledArg,
        coverageTreeManifest,
        environmentThemesManifest,
        doubleClickZoom,
        _containerId,
        trafficEnabled,
        trafficDisableWhenEnteringIndoorMaps,
        indoorLabelsAlwaysHidden,
        indoorSelectionTimeoutDuration.toString()
    ];

    var _onRemove = function() {
        _onMapRemoveCallback();
        _this.leafletMap._initEvents(true, _canvas);

        if (_this._indoorEntranceMarkerUpdater) {
            _this._indoorEntranceMarkerUpdater.removeAllEntranceMarkers();
        }

        _mapContainer.onRemove();

        var gl = _Module.ctx || _Module.K;
        if (gl && "getExtension" in gl) {
            gl.getExtension("WEBGL_lose_context").loseContext();
        }
    };

    this.leafletMap = new EegeoLeafletMap(
        _browserWindow,
        _mapContainer.overlay,
        options,
        _onRemove,
        _cameraModule,
        _precacheModule,
        _themesModule,
        _indoorsModule,
        _polygonModule,
        _polylineModule,
        _layerPointMappingModule,
        _routingModule,
        _renderingModule,
        _buildingsModule,
        _propModule,
        _indoorMapEntityInformationModule,
        _indoorMapFloorOutlineInformationModule,
        _blueSphereModule,
        _mapRuntimeModule,
        _versionModule,
        _heatmapModule,
        _frameRateModule
    );

    this.leafletMap._initEvents(false, _canvas);

    var _mapMoveEvents = new MapMoveEvents(this.leafletMap);

    var _modules = [
        _layerPointMappingModule,
        _themesModule,
        _indoorsModule,
        _precacheModule,
        _cameraModule,
        _polygonModule,
        _polylineModule,
        _renderingModule,
        _buildingsModule,
        _propModule,
        _indoorMapEntityInformationModule,
        _indoorMapFloorOutlineInformationModule,
        _blueSphereModule,
        _mapRuntimeModule,
        _versionModule,
        _heatmapModule,
        _frameRateModule
    ];

    this._indoorEntranceMarkerUpdater = null;

    if (options.displayEntranceMarkers) {
        this._indoorEntranceMarkerUpdater = new IndoorEntranceMarkerUpdater(this.leafletMap, _indoorsModule);
    }

    var _resizeCanvas = null;

    var _updateCanvasSize = function() {
        var newWidth = _mapContainer.width();
        var newHeight = _mapContainer.height();

        if (newWidth !== _canvasWidth || newHeight !== _canvasHeight) {
            _resizeCanvas(newWidth, newHeight);
            _canvasWidth = newWidth;
            _canvasHeight = newHeight;
        }
    };

    this.onInitialized = function(eegeoApiPointer, emscriptenApiPointer) {
        _mapContainer.onInitialized();
        _resizeCanvas = _Module.cwrap("resizeCanvas", null, ["number", "number"]);
        _emscriptenApi.onInitialized(eegeoApiPointer, emscriptenApiPointer, _onUpdate, _onDraw, _onInitialStreamingCompleted);

        _mapMoveEvents.setEventCallbacks(_emscriptenApi.cameraApi);

        _modules.forEach(function(module) {
            module.onInitialized();
        });
        this.leafletMap.onInitialized(_emscriptenApi);
    };

    this.onError = function(errorMessage) {
        _mapContainer.onError(errorMessage);
    };

    this._setIndoorTransitionCompleteEventListener = function(callback) {
        this.leafletMap.once("moveend", callback);
    };

    var _this = this;

    var _onUpdate = function(deltaSeconds) {
        _updateCanvasSize();

        _modules.forEach(function(module) {
            module.onUpdate(deltaSeconds);
        });

        _this.leafletMap._onUpdate();
    };

    var _onDraw = function(deltaSeconds) {
        _modules.forEach(function(module) {
            module.onDraw(deltaSeconds);
        });

        _this.leafletMap._onDraw();
    };

    var _onInitialStreamingCompleted = function() {
        _modules.forEach(function(module) {
            module.onInitialStreamingCompleted();
        });
        _this.leafletMap.onInitialStreamingCompleted();
    };
};

module.exports = EegeoMapController;
