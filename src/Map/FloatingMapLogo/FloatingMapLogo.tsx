import * as React from 'react';
import './FloatingMapLogo.less';

import { CSS_PREFIX } from '../../constants';
// i18n
export interface WindowLocale {
}

interface DefaultProps {
  /**
   * The imageSrc.
   */
  imageSrc: string;
  /**
   * Whether the map-logo is absolutely postioned or not
   */
  absolutelyPositioned: boolean;
}

interface BaseProps {
  /**
   * An optional CSS class which should be added.
   */
  className?: string;
  /**
   * The image height
   */
  imageHeight: string;
}

export type FloatingMapLogoProps = BaseProps & Partial<DefaultProps> & React.HTMLAttributes<HTMLImageElement>;

/**
 * Class representing a floating map logo
 *
 * @class The FloatingMapLogo
 * @extends React.Component
 */
class FloatingMapLogo extends React.Component<FloatingMapLogoProps> {

  /**
   * The className added to this component.
   * @private
   */
  className = `${CSS_PREFIX}floatingmaplogo`;

  /**
   * The properties.
   */
  static propTypes = {
  };

  /**
   * The default properties.
   */
  static defaultProps: DefaultProps = {
    imageSrc: 'logo.png',
    absolutelyPositioned: false
  };

  /**
   * The render function.
   */
  render() {
    const {
      imageSrc,
      imageHeight,
      absolutelyPositioned,
      className,
      style
    } = this.props;

    const finalClassName = className
      ? `${className} ${this.className}`
      : this.className;

    if (absolutelyPositioned) {
      Object.assign(style, {'position': 'absolute'});
    }

    return (
      <img
        className={finalClassName}
        src={imageSrc}
        height={imageHeight}
        style={style}
      >
      </img>
    );
  }
}

export default FloatingMapLogo;
