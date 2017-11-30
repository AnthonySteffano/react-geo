/*eslint-env jest*/

import TestUtil from '../../Util/TestUtil';
import Logger from '../../Util/Logger';

import OlLayerVector from 'ol/layer/vector';
import OlInteractionDraw from 'ol/interaction/draw';
import OlFeature from 'ol/feature';
import OlGeomLineString from 'ol/geom/linestring';

import { MeasureButton, MeasureUtil } from '../../index';

describe('<MeasureButton />', () => {

  let map;

  beforeEach(() => {
    map = TestUtil.createMap();
  });

  describe('#Basics', () => {
    it('is defined', () => {
      expect(MeasureButton).not.toBeUndefined();
    });

    it('can be rendered', () => {
      const wrapper = TestUtil.mountComponent(MeasureButton, {
        map: map,
        measureType: 'line'
      });
      expect(wrapper).not.toBeUndefined();
    });

    it('measureType prop must have valid value', () => {
      const wrapper = TestUtil.mountComponent(MeasureButton, {
        map: map,
        measureType: 'line'
      });

      const measureTypeValidValues = [
        'line',
        'area',
        'angle'
      ];

      expect(measureTypeValidValues).toContain(wrapper.props().measureType);

      let spy = {};
      spy.console = jest.spyOn(console, 'error').mockImplementation(() => {});

      wrapper.setProps({
        measureType: 'invalid'
      });

      expect(spy.console).toHaveBeenCalled();
      expect(spy.console.mock.calls.length).toBe(1);
      expect(spy.console.mock.calls[0][0]).toContain('Warning: Failed prop type');

      spy.console.mockRestore();
    });

    it('allows to set some props', () => {
      const wrapper = TestUtil.mountComponent(MeasureButton, {
        map: map,
        measureType: 'line'
      });

      wrapper.setProps({
        measureLayerName: 'measureLayerName',
        fillColor: '#ff0000',
        strokeColor: '#0000ff',
        showMeasureInfoOnClickedPoints: true,
        clickToDrawText: 'Click to draw',
        continuePolygonMsg: 'Continue draw polygon',
        continueLineMsg: 'Continue draw line',
        continueAngleMsg: 'Continue draw angle',
        decimalPlacesInTooltips: 5,
        measureTooltipCssClasses: {
          tooltip: 'tooltip-cls',
          tooltipDynamic: 'dynamic-tooltip-cls',
          tooltipStatic: 'static-tooltip-cls'
        },
        pressed: true
      });

      expect(wrapper.props().measureLayerName).toBe('measureLayerName');
      expect(wrapper.props().fillColor).toBe('#ff0000');
      expect(wrapper.props().strokeColor).toBe('#0000ff');
      expect(wrapper.props().showMeasureInfoOnClickedPoints).toBe(true);
      expect(wrapper.props().clickToDrawText).toBe('Click to draw');
      expect(wrapper.props().continuePolygonMsg).toBe('Continue draw polygon');
      expect(wrapper.props().continueLineMsg).toBe('Continue draw line');
      expect(wrapper.props().continueAngleMsg).toBe('Continue draw angle');
      expect(wrapper.props().decimalPlacesInTooltips).toBe(5);
      expect(wrapper.props().measureTooltipCssClasses).toEqual({
        tooltip: 'tooltip-cls',
        tooltipDynamic: 'dynamic-tooltip-cls',
        tooltipStatic: 'static-tooltip-cls'
      });
      expect(wrapper.props().pressed).toBe(true);

      expect(wrapper.props().measureTooltipCssClasses).toBeInstanceOf(Object);
      expect(wrapper.find('button', {pressed: true}).length).toBe(1);

    });

    it('warns if no toggle callback method is given', () => {
      const logSpy = jest.spyOn(Logger, 'debug');
      const wrapper = TestUtil.mountComponent(MeasureButton, {
        map: map,
        measureType: 'line',
        onToggle: () => {}
      });

      wrapper.setProps({
        onToggle: null
      });

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy.mock.calls[0][0]).toContain('No onToggle method given');

      logSpy.mockReset();
      logSpy.mockRestore();
    });
  });

  describe('#Static methods', () => {

    describe('#onToggle', () => {
      it('calls a given toggle callback method if the pressed state changes', () => {
        const onToggle = jest.fn();

        let props = {
          map: map,
          measureType: 'line',
          onToggle: onToggle
        };

        const wrapper = TestUtil.mountComponent(MeasureButton, props);

        wrapper.setProps({
          pressed: true
        });

        expect(onToggle).toHaveBeenCalledTimes(1);
      });

      it('changes drawInteraction and event listener state if the button was toggled', () => {
        const wrapper = TestUtil.mountComponent(MeasureButton, {
          map: map,
          measureType: 'angle'
        });

        wrapper.setProps({
          pressed: true
        });

        const instance = wrapper.instance();

        expect(wrapper.state('drawInteraction').getActive()).toBe(true);
        expect(instance._eventKeys.drawstart).toBeDefined();
        expect(instance._eventKeys.drawend).toBeDefined();
        expect(instance._eventKeys.pointermove).toBeDefined();

      });
    });

    describe('#createMeasureLayer', () => {
      it('sets measure layer to state on method call', () => {
        const wrapper = TestUtil.mountComponent(MeasureButton, {
          map: map,
          measureType: 'line'
        });

        expect(wrapper.state('measureLayer')).toBeDefined;
        expect(wrapper.state('measureLayer')).toBeInstanceOf(OlLayerVector);
      });
    });

    describe('#createDrawInteraction', () => {
      it('sets drawInteraction to state on method call', () => {
        const wrapper = TestUtil.mountComponent(MeasureButton, {
          map: map,
          measureType: 'polygon',
          pressed: true
        });

        expect(wrapper.state('drawInteraction')).toBeDefined;
        expect(wrapper.state('drawInteraction')).toBeInstanceOf(OlInteractionDraw);
        expect(wrapper.state('drawInteraction').getActive()).toBeTruthy();
      });
    });

    describe('#onDrawInteractionActiveChange', () => {
      it('calls create/remove tooltip functions depending on drawInteraction active state', () => {
        const wrapper = TestUtil.mountComponent(MeasureButton, {
          map: map,
          measureType: 'polygon',
          pressed: true
        });

        const instance = wrapper.instance();

        const removeHelpTooltipSpy = jest.spyOn(instance, 'removeHelpTooltip');
        const removeMeasureTooltipSpy = jest.spyOn(instance, 'removeMeasureTooltip');
        const createHelpTooltipSpy = jest.spyOn(instance, 'createHelpTooltip');
        const createMeasureTooltipSpy = jest.spyOn(instance, 'createMeasureTooltip');

        wrapper.state('drawInteraction').setActive(false);

        expect(removeHelpTooltipSpy).toHaveBeenCalledTimes(1);
        expect(removeMeasureTooltipSpy).toHaveBeenCalledTimes(1);

        wrapper.state('drawInteraction').setActive(true);

        expect(createHelpTooltipSpy).toHaveBeenCalledTimes(1);
        expect(createMeasureTooltipSpy).toHaveBeenCalledTimes(1);

        jest.resetAllMocks();
        jest.restoreAllMocks();
      });
    });

    describe('#drawStart', () => {

      let mockEvt;
      let wrapper;
      let instance;

      beforeEach(() => {
        mockEvt = {
          feature: new OlFeature()
        };
        wrapper = TestUtil.mountComponent(MeasureButton, {
          map: map,
          measureType: 'line',
          showMeasureInfoOnClickedPoints: true
        });
        wrapper.state('measureLayer').getSource().addFeature(mockEvt.feature);
        instance = wrapper.instance();
      });

      it('sets the feature', () => {
        instance.drawStart(mockEvt);
        expect(instance._feature).toBe(mockEvt.feature);
      });

      it('sets event key for click', () => {
        instance.drawStart(mockEvt);
        expect(instance._eventKeys.click).toBeDefined();
      });

      it('calls cleanup methods', () => {
        const cleanupTooltipsSpy = jest.spyOn(instance, 'cleanupTooltips');
        const createMeasureTooltipSpy = jest.spyOn(instance, 'createMeasureTooltip');
        const createHelpTooltipSpy = jest.spyOn(instance, 'createHelpTooltip');
        const clearSpy = jest.spyOn(wrapper.state('measureLayer').getSource(), 'clear');

        instance.drawStart(mockEvt);

        expect(cleanupTooltipsSpy).toHaveBeenCalledTimes(1);
        expect(createMeasureTooltipSpy).toHaveBeenCalledTimes(1);
        expect(createHelpTooltipSpy).toHaveBeenCalledTimes(1);
        expect(clearSpy).toHaveBeenCalledTimes(1);

        jest.resetAllMocks();
        jest.restoreAllMocks();
      });
    });

    describe('#drawEnd', () => {

      let wrapper;
      let instance;

      beforeEach(() => {
        wrapper = TestUtil.mountComponent(MeasureButton, {
          map: map,
          measureType: 'line',
          showMeasureInfoOnClickedPoints: true
        });
        instance = wrapper.instance();
      });

      it ('unset click event key', () => {
        instance.drawEnd();
        expect(instance._eventKeys.click).toBeNull();
      });

      it ('calls removeMeasureTooltip method', () => {
        wrapper.setProps({
          showMeasureInfoOnClickedPoints: true
        });
        const removeMeasureTooltipSpy = jest.spyOn(instance, 'removeMeasureTooltip');
        instance.drawEnd();
        expect(removeMeasureTooltipSpy).toHaveBeenCalledTimes(1);
        jest.resetAllMocks();
        jest.restoreAllMocks();
      });

      it ('sets correct properties on measureTooltipElement', () => {
        wrapper.setProps({
          showMeasureInfoOnClickedPoints: false
        });

        instance.createMeasureTooltip();
        instance.drawEnd();

        const expectedClassName = 'react-geo-measure-tooltip react-geo-measure-tooltip-static';
        const expectedOffset = [0, -7];
        expect(instance._measureTooltipElement.className).toContain(expectedClassName);
        expect(instance._measureTooltip.getOffset()).toEqual(expectedOffset);
      });

      it ('unsets the feature', () => {
        instance.drawEnd();
        expect(instance._feature).toBeNull;
      });

      it ('calls createMeasureTooltip method', () => {
        wrapper.setProps({
          showMeasureInfoOnClickedPoints: true
        });
        const createMeasureTooltipSpy = jest.spyOn(instance, 'createMeasureTooltip');
        instance.drawEnd();
        expect(createMeasureTooltipSpy).toHaveBeenCalledTimes(1);
        jest.resetAllMocks();
        jest.restoreAllMocks();
      });
    });

    describe('#addMeasureStopTooltip', () => {

      let wrapper;
      let instance;
      let mockEvt;
      let mockLineFeat;

      beforeEach(() => {

        wrapper = TestUtil.mountComponent(MeasureButton, {
          map: map,
          measureType: 'line'
        });
        instance = wrapper.instance();
        mockEvt = {
          coordinate: [100, 100]
        };
        mockLineFeat = new OlFeature({
          geometry: new OlGeomLineString([[0, 0], [0, 100]])
        });
      });

      it('becomes a feature with valid geometry', () => {

        instance._feature = mockLineFeat;
        instance.addMeasureStopTooltip(mockEvt);

        expect(instance._feature).toBeDefined();
        expect(instance._feature.getGeometry()).toBeDefined();

        const value = MeasureUtil.formatLength(instance._feature.getGeometry(), map, 2);
        expect(value).toBe('100 m');
      });

      it('adds a tooltip overlay with correct properties and position to the map', () => {

        instance._feature = mockLineFeat;
        instance.addMeasureStopTooltip(mockEvt);

        const value = MeasureUtil.formatLength(instance._feature.getGeometry(), map, 2);
        expect(parseInt(value, 10)).toBeGreaterThan(10);

        const overlays = map.getOverlays();
        expect(overlays.getArray().length).toBe(1);

        const overlay = overlays.getArray()[0];
        const offset = overlay.getOffset();
        const positioning = overlay.getPositioning();
        const className = overlay.getElement().className;

        expect(offset).toEqual([0, -15]);
        expect(positioning).toBe('bottom-center');
        expect(className).toBe('react-geo-measure-tooltip react-geo-measure-tooltip-static');
        expect(overlay.getPosition()).toEqual(mockEvt.coordinate);

        expect(instance._createdTooltipDivs.length).toBe(1);
        expect(instance._createdTooltipOverlays.length).toBe(1);
      });
    });

    describe('#createMeasureTooltip', () => {
      it('', () => {

      });
    });
  });

});
