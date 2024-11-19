import { heightPropDefs } from '../props/height.props.js';
import { widthPropDefs } from '../props/width.props.js';

import type { PropDef } from '../props/prop-def.js';

const skeletonPropDefs = {
  loading: { type: 'boolean', default: true },
  ...widthPropDefs,
  ...heightPropDefs,
} satisfies {
  loading: PropDef<boolean>;
};

export { skeletonPropDefs };
