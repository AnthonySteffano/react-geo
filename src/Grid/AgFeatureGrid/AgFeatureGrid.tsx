import * as React from 'react';

import OlStyle from 'ol/style/Style';
import OlStyleFill from 'ol/style/Fill';
import OlStyleCircle from 'ol/style/Circle';
import OlStyleStroke from 'ol/style/Stroke';
import OlMap from 'ol/Map';
import OlFeature from 'ol/Feature';
import OlSourceVector from 'ol/source/Vector';
import OlLayerVector from 'ol/layer/Vector';
import OlGeomGeometry from 'ol/geom/Geometry';
import OlGeomGeometryCollection from 'ol/geom/GeometryCollection';
import OlMapBrowserEvent from 'ol/MapBrowserEvent';

const _isArray = require('lodash/isArray');
const _differenceWith = require('lodash/differenceWith');
const _isEqual = require('lodash/isEqual');
const _isFunction = require('lodash/isFunction');
const _kebabCase = require('lodash/kebabCase');

import MapUtil from '@terrestris/ol-util/dist/MapUtil/MapUtil';

import { CSS_PREFIX } from '../../constants';

import '@ag-grid-community/core/dist/styles/ag-grid.css';
import '@ag-grid-community/core/dist/styles/ag-theme-balham.css';
import '@ag-grid-community/core/dist/styles/ag-theme-fresh.css';
import { AgGridReact } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import {
  RowClickedEvent,
  CellMouseOverEvent,
  CellMouseOutEvent,
  SelectionChangedEvent
} from '@ag-grid-community/core';

interface AgFeatureGridDefaultProps {
  /**
   * The height of the grid.
   */
  height: number | string;
  /**
   * The theme to use for the grid. See
   * https://www.ag-grid.com/javascript-grid-styling/ for available options.
   * Note: CSS must be loaded to use the theme!
   */
  theme: string;
  /**
   * The features to show in the grid and the map (if set).
   */
  features: OlFeature[];
  /**
   */
  attributeBlacklist?: string[];
  /**
   * The default style to apply to the features.
   */
  featureStyle: OlStyle | (() => OlStyle);
  /**
   * The highlight style to apply to the features.
   */
  highlightStyle: OlStyle | (() => OlStyle);
  /**
   * The select style to apply to the features.
   */
  selectStyle: OlStyle | (() => OlStyle);
  /**
   * The name of the vector layer presenting the features in the grid.
   */
  layerName: string;
  /**
   * Custom column definitions to apply to the given column (mapping via key).
   */
  columnDefs: any;
  /**
   * A Function that creates the rowkey from the given feature.
   * Receives the feature as property.
   * Default is: feature => feature.ol_uid
   */
  keyFunction: (feature: OlFeature) => string;
  /**
   * Whether the map should center on the current feature's extent on init or
   * not.
   */
  zoomToExtent: boolean;
  /**
   * Whether rows and features should be selectable or not.
   */
  selectable: boolean;
}

export interface AgFeatureGridProps extends Partial<AgFeatureGridDefaultProps> {
  /**
   * The width of the grid.
   *
   * @type {Number|String}
   */
  width: number | string;
  /**
   * A CSS class which should be added to the table.
   */
  className?: string;
  /**
   * A CSS class to add to each table row or a function that
   * is evaluated for each record.
   */
  rowClassName?: string | ((record: any) => string);
  /**
   * The map the features should be rendered on. If not given, the features
   * will be rendered in the table only.
   */
  map: OlMap;
  /**
   * Custom row data to be shown in feature grid. This might be helpful if
   * original feature properties should be manipulated in some way before they
   * are represented in grid.
   * If provided, #getRowData method won't be called.
   */
  rowData: any[];
  /**
   * Callback function, that will be called on rowclick.
   */
  onRowClick?: (row: any, feature: OlFeature, evt: RowClickedEvent) => void;
  /**
   * Callback function, that will be called on rowmouseover.
   */
  onRowMouseOver?: (row: any, feature: OlFeature, evt: CellMouseOverEvent) => void;
  /**
   * Callback function, that will be called on rowmouseout.
   */
  onRowMouseOut?: (row: any, feature: OlFeature, evt: CellMouseOutEvent) => void;
  /**
   * Callback function, that will be called if the selection changes.
   */
  onRowSelectionChange?: (
    selectedRowsAfter: any[],
    selectedFeatures: OlFeature[],
    deselectedRows: any[],
    deselectedFeatures: OlFeature[],
    evt: SelectionChangedEvent
  ) => void;
  /**
   * Optional callback function, that will be called if `selectable` is set
   * `true` and the a `click` event on the map occurs, e.g. a feature has been
   * selected in the map. The function receives the olEvt and the selected
   * features (if any).
   */
  onMapSingleClick: (olEvt: OlMapBrowserEvent, selectedFeatures: OlFeature[]) => void;
  /*
   * A Function that is called once the grid is ready.
   */
  onGridIsReady?: (grid: any) => void;
}

interface AgFeatureGridState {
  grid: any;
  selectedRows: any[];
}

/**
 * The AgFeatureGrid.
 *
 * @class The AgFeatureGrid
 * @extends React.Component
 */
export class AgFeatureGrid extends React.Component<AgFeatureGridProps, AgFeatureGridState> {

  /**
   * The reference of this grid.
   * @type {String}
   * @private
   */
  _ref;

  /**
   * The className added to this component.
   * @type {String}
   * @private
   */
  _className = `${CSS_PREFIX}ag-feature-grid`;

  /**
   * The class name to add to each table row.
   * @type {String}
   * @private
   */
  _rowClassName = `${CSS_PREFIX}ag-feature-grid-row`;

  /**
   * The prefix to use for each table row class.
   * @type {String}
   * @private
   */
  _rowKeyClassNamePrefix = 'row-key-';

  /**
   * The hover class name.
   * @type {String}
   * @private
   */
  _rowHoverClassName = 'ag-row-hover';

  /**
   * The source holding the features of the grid.
   * @type {ol.source.Vector}
   * @private
   */
  _source = null;

  /**
   * The layer representing the features of the grid.
   * @type {ol.layer.Vector}
   * @private
   */
  _layer = null;

  /**
   * The default properties.
   * @type {Object}
   */
  static defaultProps: AgFeatureGridDefaultProps = {
    theme: 'ag-theme-balham',
    height: 250,
    features: [],
    attributeBlacklist: [],
    featureStyle: new OlStyle({
      fill: new OlStyleFill({
        color: 'rgba(255, 255, 255, 0.5)'
      }),
      stroke: new OlStyleStroke({
        color: 'rgba(73, 139, 170, 0.9)',
        width: 1
      }),
      image: new OlStyleCircle({
        radius: 6,
        fill: new OlStyleFill({
          color: 'rgba(255, 255, 255, 0.5)'
        }),
        stroke: new OlStyleStroke({
          color: 'rgba(73, 139, 170, 0.9)',
          width: 1
        })
      })
    }),
    highlightStyle: new OlStyle({
      fill: new OlStyleFill({
        color: 'rgba(230, 247, 255, 0.8)'
      }),
      stroke: new OlStyleStroke({
        color: 'rgba(73, 139, 170, 0.9)',
        width: 1
      }),
      image: new OlStyleCircle({
        radius: 6,
        fill: new OlStyleFill({
          color: 'rgba(230, 247, 255, 0.8)'
        }),
        stroke: new OlStyleStroke({
          color: 'rgba(73, 139, 170, 0.9)',
          width: 1
        })
      })
    }),
    selectStyle: new OlStyle({
      fill: new OlStyleFill({
        color: 'rgba(230, 247, 255, 0.8)'
      }),
      stroke: new OlStyleStroke({
        color: 'rgba(73, 139, 170, 0.9)',
        width: 2
      }),
      image: new OlStyleCircle({
        radius: 6,
        fill: new OlStyleFill({
          color: 'rgba(230, 247, 255, 0.8)'
        }),
        stroke: new OlStyleStroke({
          color: 'rgba(73, 139, 170, 0.9)',
          width: 2
        })
      })
    }),
    layerName: 'react-geo-feature-grid-layer',
    columnDefs: {},
    keyFunction: feature => feature.ol_uid,
    zoomToExtent: false,
    selectable: false
  };

  /**
   * The constructor.
   */
  constructor(props: AgFeatureGridProps) {
    super(props);

    this.state = {
      grid: null,
      selectedRows: []
    };
  }

  /**
   * Called on lifecycle phase componentDidMount.
   */
  componentDidMount() {
    const {
      map,
      features,
      zoomToExtent
    } = this.props;

    this.initVectorLayer(map);
    this.initMapEventHandlers(map);

    if (zoomToExtent) {
      this.zoomToFeatures(features);
    }
  }

  /**
   * Invoked immediately after updating occurs. This method is not called for
   * the initial render.
   *
   * @param {Object} prevProps The previous props.
   */
  componentDidUpdate(prevProps: AgFeatureGridProps) {
    const {
      map,
      features,
      selectable,
      zoomToExtent
    } = this.props;

    if (!(_isEqual(prevProps.map, map))) {
      this.initVectorLayer(map);
      this.initMapEventHandlers(map);
    }

    if (!(_isEqual(prevProps.features, features))) {
      if (this._source) {
        this._source.clear();
        this._source.addFeatures(features);
      }

      if (zoomToExtent) {
        this.zoomToFeatures(features);
      }
    }

    if (!(_isEqual(prevProps.selectable, selectable))) {
      if (selectable && map) {
        map.on('singleclick', this.onMapSingleClick);
      } else {
        if (map) {
          map.un('singleclick', this.onMapSingleClick);
        }
      }
    }
  }

  /**
   * Called on lifecycle phase componentWillUnmount.
   */
  componentWillUnmount() {
    this.deinitVectorLayer();
    this.deinitMapEventHandlers();
  }

  /**
   * Initialized the vector layer that will be used to draw the input features
   * on and adds it to the map (if any).
   *
   * @param {ol.Map} map The map to add the layer to.
   */
  initVectorLayer = map => {
    const {
      features,
      featureStyle,
      layerName
    } = this.props;

    if (!(map instanceof OlMap)) {
      return;
    }

    if (MapUtil.getLayerByName(map, layerName)) {
      return;
    }

    const source = new OlSourceVector({
      features: features
    });

    const layer = new OlLayerVector({
      name: layerName,
      source: source,
      style: featureStyle
    });

    map.addLayer(layer);

    this._source = source;
    this._layer = layer;
  }

  /**
   * Adds map event callbacks to highlight and select features in the map (if
   * given) on pointermove and singleclick. Hovered and selected features will
   * be highlighted and selected in the grid as well.
   *
   * @param {ol.Map} map The map to register the handlers to.
   */
  initMapEventHandlers = map => {
    const {
      selectable
    } = this.props;

    if (!(map instanceof OlMap)) {
      return;
    }

    map.on('pointermove', this.onMapPointerMove);

    if (selectable) {
      map.on('singleclick', this.onMapSingleClick);
    }
  }

  /**
   * Highlights the feature beneath the cursor on the map and in the grid.
   *
   * @param {ol.MapBrowserEvent} olEvt The ol event.
   */
  onMapPointerMove = olEvt => {
    const {
      map,
      features,
      highlightStyle,
      selectStyle
    } = this.props;

    const {
      grid
    } = this.state;

    const selectedRowKeys = this.getSelectedRowKeys();

    const selectedFeatures = map.getFeaturesAtPixel(olEvt.pixel, {
      layerFilter: layerCand => layerCand === this._layer
    }) || [];

    if (!grid || !grid.api) {
      return;
    }

    const rowRenderer = grid.api.rowRenderer;

    features.forEach(feature => {
      const key = this.props.keyFunction(feature);

      let rc;
      rowRenderer.forEachRowComp((idx, rowComp) => {
        if (rowComp.getRowNode().data.key === key) {
          rc = rowComp;
        }
      });

      if (rc) {
        const el = rc.getBodyRowElement();

        if (el) {
          el.classList.remove(this._rowHoverClassName);
        }
      }
      if (selectedRowKeys.includes(key)) {
        feature.setStyle(selectStyle);
      } else {
        feature.setStyle(null);
      }
    });

    selectedFeatures.forEach(feature => {
      const key = this.props.keyFunction(feature);
      let rc;
      rowRenderer.forEachRowComp((idx, rowComp) => {
        if (rowComp.getRowNode().data.key === key) {
          rc = rowComp;
        }
      });

      if (rc) {
        const el = rc.getBodyRowElement();

        if (el) {
          el.classList.add(this._rowHoverClassName);
        }
      }
      feature.setStyle(highlightStyle);
    });
  }

  /**
   * Selects the selected feature in the map and in the grid.
   *
   * @param olEvt The ol event.
   */
  onMapSingleClick = (olEvt: OlMapBrowserEvent) => {
    const {
      map,
      selectStyle,
      onMapSingleClick
    } = this.props;

    const selectedRowKeys = this.getSelectedRowKeys();

    const selectedFeatures = map.getFeaturesAtPixel(olEvt.pixel, {
      layerFilter: layerCand => layerCand === this._layer
    }) || [];

    if (_isFunction(onMapSingleClick)) {
      onMapSingleClick(olEvt, selectedFeatures);
    }

    selectedFeatures.forEach(selectedFeature => {
      const key = this.props.keyFunction(selectedFeature);
      if (selectedRowKeys && selectedRowKeys.includes(key)) {
        selectedFeature.setStyle(null);

        const node = this.getRowFromFeatureKey(key);
        if (node) {
          node.setSelected(false);
        }
      } else {
        selectedFeature.setStyle(selectStyle);

        const node = this.getRowFromFeatureKey(key);
        if (node) {
          node.setSelected(true);
        }
      }
    });
  }

  /**
   * Removes the vector layer from the given map (if any).
   */
  deinitVectorLayer = () => {
    const {
      map
    } = this.props;

    if (!(map instanceof OlMap)) {
      return;
    }

    map.removeLayer(this._layer);
  }

  /**
   * Unbinds the pointermove and click event handlers from the map (if given).
   */
  deinitMapEventHandlers = () => {
    const {
      map,
      selectable
    } = this.props;

    if (!(map instanceof OlMap)) {
      return;
    }

    map.un('pointermove', this.onMapPointerMove);

    if (selectable) {
      map.un('singleclick', this.onMapSingleClick);
    }
  }

  /**
   * Returns the column definitions out of the attributes of the first
   * given feature.
   *
   * @return {Array} The column definitions.
   */
  getColumnDefs = () => {
    const {
      attributeBlacklist,
      features,
      columnDefs,
      selectable
    } = this.props;

    let columns = [];
    const feature = features[0];

    if (!(feature instanceof OlFeature)) {
      return columns;
    }

    const props = feature.getProperties();

    if (selectable) {
      columns.push({
        headerName: '',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        width: 28,
        pinned: 'left',
        lockPosition: true,
        suppressMenu: true,
        suppressSorting: true,
        suppressFilter: true,
        suppressResize: true,
        suppressMovable: true
      });
    }

    let index = -1;

    Object.keys(props).forEach(key => {
      if (attributeBlacklist.includes(key)) {
        return;
      }

      if (props[key] instanceof OlGeomGeometry) {
        return;
      }

      if (columnDefs[key] && columnDefs[key].index !== undefined) {
        index = columnDefs[key].index;
      } else {
        ++index;
      }
      columns[index] = {
        headerName: key,
        field: key,
        ...columnDefs[key]
      };
    });

    return columns;
  }

  /**
   * Returns the table row data from all of the given features.
   *
   * @return {Array} The table data.
   */
  getRowData = () => {
    const {
      features
    } = this.props;

    let data = [];

    features.forEach(feature => {
      const properties = feature.getProperties();
      const filtered = Object.keys(properties)
        .filter(key => !(properties[key] instanceof OlGeomGeometry))
        .reduce((obj, key) => {
          obj[key] = properties[key];
          return obj;
        }, {});

      data.push({
        key: this.props.keyFunction(feature),
        ...filtered
      });
    });

    return data;
  }

  /**
   * Returns the correspondig feature for the given table row key.
   *
   * @param {Number} key The row key to obtain the feature from.
   * @return {ol.Feature} The feature candidate.
   */
  getFeatureFromRowKey = key => {
    const {
      features,
      keyFunction
    } = this.props;

    const feature = features.filter(f => keyFunction(f) === key);

    return feature[0];
  }

  /**
   * Returns the correspondig rowNode for the given feature id.
   *
   * @param {Number} key The feature's key to obtain the row from.
   * @return {Object} The row candidate.
   */
  getRowFromFeatureKey = key => {
    const {
      grid
    } = this.state;

    let rowNode;

    if (!grid || !grid.api) {
      return;
    }

    grid.api.forEachNode(node => {
      if (node.data.key === key) {
        rowNode = node;
      }
    });

    return rowNode;
  }

  /**
   * Returns the currently selected row keys.
   *
   * @return {Number[]} An array with the selected row keys.
   */
  getSelectedRowKeys = () => {
    const {
      grid
    } = this.state;

    if (!grid || !grid.api) {
      return;
    }

    const selectedRows = grid.api.getSelectedRows();

    return selectedRows.map(row => row.key);
  }

  /**
   * Called on row click and zooms the the corresponding feature's extent.
   *
   * @param {Object} row The clicked row.
   */
  onRowClick = (evt: RowClickedEvent) => {
    const {
      onRowClick
    } = this.props;

    const row = evt.data;
    const feature = this.getFeatureFromRowKey(row.key);

    if (_isFunction(onRowClick)) {
      onRowClick(row, feature, evt);
    } else {
      this.zoomToFeatures([feature]);
    }
  }

  /**
   * Called on row mouseover and hightlights the corresponding feature's
   * geometry.
   *
   * @param {Object} row The highlighted row.
   */
  onRowMouseOver = (evt: CellMouseOverEvent) => {
    const {
      onRowMouseOver
    } = this.props;

    const row = evt.data;
    const feature = this.getFeatureFromRowKey(row.key);

    if (_isFunction(onRowMouseOver)) {
      onRowMouseOver(row, feature, evt);
    }

    this.highlightFeatures([feature]);
  }

  /**
   * Called on mouseout and unhightlights any highlighted feature.
   *
   * @param {Object} row The unhighlighted row.
   */
  onRowMouseOut = (evt: CellMouseOutEvent) => {
    const {
      onRowMouseOut
    } = this.props;

    const row = evt.data;
    const feature = this.getFeatureFromRowKey(row.key);

    if (_isFunction(onRowMouseOut)) {
      onRowMouseOut(row, feature, evt);
    }

    this.unhighlightFeatures([feature]);
  }

  /**
   * Fits the map's view to the extent of the passed features.
   *
   * @param {ol.Feature[]} features The features to zoom to.
   */
  zoomToFeatures = features => {
    const {
      map
    } = this.props;

    if (!(map instanceof OlMap)) {
      return;
    }

    let featGeometries = [];
    features.forEach(feature => {
      featGeometries.push(feature.getGeometry());
    });

    if (featGeometries.length > 0) {
      const geomCollection = new OlGeomGeometryCollection(featGeometries);
      map.getView().fit(geomCollection.getExtent());
    }
  }

  /**
   * Highlights the given features in the map.
   *
   * @param {ol.Feature[]} highlightFeatures The features to highlight.
   */
  highlightFeatures = highlightFeatures => {
    const {
      map,
      highlightStyle
    } = this.props;

    if (!(map instanceof OlMap)) {
      return;
    }

    highlightFeatures.forEach(feature => feature.setStyle(highlightStyle));
  }

  /**
   * Unhighlights the given features in the map.
   *
   * @param {ol.Feature[]} unhighlightFeatures The features to unhighlight.
   */
  unhighlightFeatures = unhighlightFeatures => {
    const {
      map,
      selectStyle
    } = this.props;

    if (!(map instanceof OlMap)) {
      return;
    }

    const selectedRowKeys = this.getSelectedRowKeys();

    unhighlightFeatures.forEach(feature => {
      const key = this.props.keyFunction(feature);
      if (selectedRowKeys && selectedRowKeys.includes(key)) {
        feature.setStyle(selectStyle);
      } else {
        feature.setStyle(null);
      }
    });
  }

  /**
   * Sets the select style to the given features in the map.
   *
   * @param {ol.Feature[]} features The features to select.
   */
  selectFeatures = features => {
    const {
      map,
      selectStyle
    } = this.props;

    if (!(map instanceof OlMap)) {
      return;
    }

    features.forEach(feature => {
      if (feature) {
        feature.setStyle(selectStyle);
      }
    });
  }

  /**
   * Resets the style of all features.
   */
  resetFeatureStyles = () => {
    const {
      map,
      features
    } = this.props;

    if (!(map instanceof OlMap)) {
      return;
    }

    features.forEach(feature => feature.setStyle(null));
  }

  /**
   * Called if the selection changes.
   */
  onSelectionChanged = (evt: SelectionChangedEvent) => {
    const {
      onRowSelectionChange
    } = this.props;

    const {
      grid,
      selectedRows
    } = this.state;

    let selectedRowsAfter;
    if (!grid || !grid.api) {
      selectedRowsAfter = evt.api.getSelectedRows();
    } else {
      selectedRowsAfter = grid.api.getSelectedRows();
    }

    const deselectedRows = _differenceWith(selectedRows, selectedRowsAfter, (a: any , b: any) => a.key === b.key);

    const selectedFeatures = selectedRowsAfter.map(row => this.getFeatureFromRowKey(row.key));
    const deselectedFeatures = deselectedRows.map(row => this.getFeatureFromRowKey(row.key));

    // update state
    this.setState({
      selectedRows: selectedRowsAfter
    });

    if (_isFunction(onRowSelectionChange)) {
      onRowSelectionChange(selectedRowsAfter, selectedFeatures, deselectedRows, deselectedFeatures, evt);
    }

    this.resetFeatureStyles();
    this.selectFeatures(selectedFeatures);
  }

  /**
   *
   * @param {*} grid
   */
  onGridReady(grid: any) {
    this.setState({
      grid
    }, this.onVisiblityChange);

    if (this.props.onGridIsReady) {
      this.props.onGridIsReady(grid);
    }
  }

  /**
   *
   */
  onVisiblityChange() {
    if (this.state.grid) {
      this.state.grid.api.sizeColumnsToFit();
    }
  }

  /**
   * The render method.
   */
  render() {
    const {
      className,
      height,
      width,
      theme,
      rowClassName,
      features,
      map,
      attributeBlacklist,
      onRowClick,
      onRowMouseOver,
      onRowMouseOut,
      zoomToExtent,
      selectable,
      featureStyle,
      highlightStyle,
      selectStyle,
      layerName,
      columnDefs,
      children,
      rowData,
      ...passThroughProps
    } = this.props;

    const finalClassName = className
      ? `${className} ${this._className} ${theme}`
      : `${this._className} ${theme}`;

    // TODO: Not sure, if this is still needed. One may want to get a specific
    // row by using getRowFromFeatureKey instead.
    let rowClassNameFn;
    if (_isFunction(rowClassName)) {
      rowClassNameFn = node => {
        const determinedRowClass = (rowClassName as Function)(node.data);
        return `${this._rowClassName} ${determinedRowClass}`;
      };
    } else {
      const finalRowClassName = rowClassName
        ? `${rowClassName} ${this._rowClassName}`
        : this._rowClassName;
      rowClassNameFn = node => `${finalRowClassName} ${this._rowKeyClassNamePrefix}${_kebabCase(node.data.key)}`;
    }

    return (
      <div
        className={finalClassName}
        style={{
          height: height,
          width: width
        }}
      >
        <AgGridReact
          columnDefs={columnDefs && _isArray(columnDefs) ? columnDefs : this.getColumnDefs()}
          rowData={rowData && _isArray(rowData) ? rowData : this.getRowData()}
          onGridReady={this.onGridReady.bind(this)}
          rowSelection="multiple"
          suppressRowClickSelection={true}
          onSelectionChanged={this.onSelectionChanged.bind(this)}
          onRowClicked={this.onRowClick.bind(this)}
          onCellMouseOver={this.onRowMouseOver.bind(this)}
          onCellMouseOut={this.onRowMouseOut.bind(this)}
          ref={ref => this._ref = ref}
          getRowClass={rowClassNameFn}
          modules={[
            ClientSideRowModelModule
          ]}
          {...passThroughProps}
        >
          {children}
        </AgGridReact>
      </div>
    );
  }
}

export default AgFeatureGrid;
