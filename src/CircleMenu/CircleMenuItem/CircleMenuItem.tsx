import * as React from 'react';

import { CSS_PREFIX } from '../../constants';

import './CircleMenuItem.less';

interface CircleMenuItemDefaultProps {
  /**
   * The duration of the animation in milliseconds. Pass 0 to avoid animation.
   */
  animationDuration: number;
}

export interface CircleMenuItemProps extends Partial<CircleMenuItemDefaultProps> {
  className?: string;
  /**
   * The radius of the CircleMenu in pixels.
   */
  radius: number;
  /**
   * The children of the CircleMenuItem. Should be just one Node.
   */
  children?: React.ReactNode;
  /**
   * The rotation Angle in degree.
   */
  rotationAngle: number;
}

/**
 * The CircleMenuItem.
 *
 * @class CircleMenuItem
 * @extends React.Component
 */
export class CircleMenuItem extends React.Component<CircleMenuItemProps> {

  /**
   * The className added to this component.
   * @private
   */
  _className = `${CSS_PREFIX}circlemenuitem`;

  /**
   * Internal reference used to apply the transformation right on the div.
   * @private
   */
  _ref = null;

  static defaultProps = {
    animationDuration: 300
  };

  /**
   * A react lifecycle method called when the component did mount.
   * It calls the applyTransformation method right after updating.
   */
  componentDidMount() {
    setTimeout(this.applyTransformation.bind(this), 1);
  }

  /**
   * A react lifecycle method called when the component did update.
   * It calls the applyTransformation method right after updating.
   */
  componentDidUpdate() {
    setTimeout(this.applyTransformation.bind(this), 1);
  }

  /**
   * Applies the transformation to the component.
   */
  applyTransformation() {
    const {
      rotationAngle,
      radius
    } = this.props;
    if (this._ref) {
      this._ref.style.transform = `rotate(${rotationAngle}deg) translate(${radius}px) rotate(-${rotationAngle}deg)`;
    }
  }

  /**
   * The render function.
   */
  render() {
    const {
      rotationAngle,
      radius,
      animationDuration,
      className,
      ...passThroughProps
    } = this.props;

    const finalClassName = className
      ? `${className} ${this._className}`
      : this._className;

    return (
      <div
        className={finalClassName}
        ref={i => this._ref = i}
        style={{
          display: 'block',
          top: '50%',
          left: '50%',
          margin: '-1.3em',
          position: 'absolute',
          transform: 'rotate(0deg) translate(0px) rotate(0deg)',
          transition: `transform ${animationDuration}ms`
        }}
        {...passThroughProps}
      >
        {this.props.children}
      </div>
    );
  }
}

export default CircleMenuItem;
