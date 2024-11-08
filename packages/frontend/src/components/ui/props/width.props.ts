import type { GetPropDefTypes, PropDef } from './prop-def.js';

const widthPropDefs = {
  /**
   * Sets the CSS **width** property.
   * Supports CSS strings and responsive objects.
   *
   * @example
   * width="100px"
   * width={{ md: '100vw', xl: '1400px' }}
   *
   * @link
   * https://developer.mozilla.org/en-US/docs/Web/CSS/width
   */
  width: {
    type: 'string',
    className: 'rt-r-w',
    customProperties: ['--width'],
    responsive: true,
  },
  /**
   * Sets the CSS **min-width** property.
   * Supports CSS strings and responsive objects.
   *
   * @example
   * minWidth="100px"
   * minWidth={{ md: '100vw', xl: '1400px' }}
   *
   * @link
   * https://developer.mozilla.org/en-US/docs/Web/CSS/min-width
   */
  minWidth: {
    type: 'string',
    className: 'rt-r-min-w',
    customProperties: ['--min-width'],
    responsive: true,
  },
  /**
   * Sets the CSS **max-width** property.
   * Supports CSS strings and responsive objects.
   *
   * @example
   * maxWidth="100px"
   * maxWidth={{ md: '100vw', xl: '1400px' }}
   *
   * @link
   * https://developer.mozilla.org/en-US/docs/Web/CSS/max-width
   */
  maxWidth: {
    type: 'string',
    className: 'rt-r-max-w',
    customProperties: ['--max-width'],
    responsive: true,
  },
} satisfies {
  width: PropDef<string>;
  minWidth: PropDef<string>;
  maxWidth: PropDef<string>;
};

type WidthProps = GetPropDefTypes<typeof widthPropDefs>;

export { widthPropDefs };
export type { WidthProps };
