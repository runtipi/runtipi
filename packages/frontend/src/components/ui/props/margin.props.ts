import type { PropDef, GetPropDefTypes } from './prop-def.js';

// prettier-ignore
const marginValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-1', '-2', '-3', '-4', '-5', '-6', '-7', '-8', '-9'] as const;

const marginPropDefs = {
  /**
   * Sets the CSS **margin** property.
   * Supports space scale values, CSS strings, and responsive objects.
   *
   * @example
   * m="4"
   * m="100px"
   * m={{ sm: '6', lg: '9' }}
   *
   * @link
   * https://developer.mozilla.org/en-US/docs/Web/CSS/margin
   */
  m: {
    type: 'enum | string',
    values: marginValues,
    responsive: true,
    className: 'rt-r-m',
    customProperties: ['--m'],
  },
  /**
   * Sets the CSS **margin-left** and **margin-right** properties.
   * Supports space scale values, CSS strings, and responsive objects.
   *
   * @example
   * mx="4"
   * mx="100px"
   * mx={{ sm: '6', lg: '9' }}
   *
   * @link
   * https://developer.mozilla.org/en-US/docs/Web/CSS/margin-left
   * https://developer.mozilla.org/en-US/docs/Web/CSS/margin-right
   */
  mx: {
    type: 'enum | string',
    values: marginValues,
    responsive: true,
    className: 'rt-r-mx',
    customProperties: ['--ml', '--mr'],
  },
  /**
   * Sets the CSS **margin-top** and **margin-bottom** properties.
   * Supports space scale values, CSS strings, and responsive objects.
   *
   * @example
   * my="4"
   * my="100px"
   * my={{ sm: '6', lg: '9' }}
   *
   * @link
   * https://developer.mozilla.org/en-US/docs/Web/CSS/margin-top
   * https://developer.mozilla.org/en-US/docs/Web/CSS/margin-bottom
   */
  my: {
    type: 'enum | string',
    values: marginValues,
    responsive: true,
    className: 'rt-r-my',
    customProperties: ['--mt', '--mb'],
  },
  /**
   * Sets the CSS **margin-top** property.
   * Supports space scale values, CSS strings, and responsive objects.
   *
   * @example
   * mt="4"
   * mt="100px"
   * mt={{ sm: '6', lg: '9' }}
   *
   * @link
   * https://developer.mozilla.org/en-US/docs/Web/CSS/margin-top
   */
  mt: {
    type: 'enum | string',
    values: marginValues,
    responsive: true,
    className: 'rt-r-mt',
    customProperties: ['--mt'],
  },
  /**
   * Sets the CSS **margin-right** property.
   * Supports space scale values, CSS strings, and responsive objects.
   *
   * @example
   * mr="4"
   * mr="100px"
   * mr={{ sm: '6', lg: '9' }}
   *
   * @link
   * https://developer.mozilla.org/en-US/docs/Web/CSS/margin-right
   */
  mr: {
    type: 'enum | string',
    values: marginValues,
    responsive: true,
    className: 'rt-r-mr',
    customProperties: ['--mr'],
  },
  /**
   * Sets the CSS **margin-bottom** property.
   * Supports space scale values, CSS strings, and responsive objects.
   *
   * @example
   * mb="4"
   * mb="100px"
   * mb={{ sm: '6', lg: '9' }}
   *
   * @link
   * https://developer.mozilla.org/en-US/docs/Web/CSS/margin-bottom
   */
  mb: {
    type: 'enum | string',
    values: marginValues,
    responsive: true,
    className: 'rt-r-mb',
    customProperties: ['--mb'],
  },
  /**
   * Sets the CSS **margin-left** property.
   * Supports space scale values, CSS strings, and responsive objects.
   *
   * @example
   * ml="4"
   * ml="100px"
   * ml={{ sm: '6', lg: '9' }}
   *
   * @link
   * https://developer.mozilla.org/en-US/docs/Web/CSS/margin-left
   */
  ml: {
    type: 'enum | string',
    values: marginValues,
    responsive: true,
    className: 'rt-r-ml',
    customProperties: ['--ml'],
  },
} satisfies {
  m: PropDef<(typeof marginValues)[number]>;
  mx: PropDef<(typeof marginValues)[number]>;
  my: PropDef<(typeof marginValues)[number]>;
  mt: PropDef<(typeof marginValues)[number]>;
  mr: PropDef<(typeof marginValues)[number]>;
  mb: PropDef<(typeof marginValues)[number]>;
  ml: PropDef<(typeof marginValues)[number]>;
};

type MarginProps = GetPropDefTypes<typeof marginPropDefs>;

export { marginPropDefs };
export type { MarginProps };
