import { container } from 'src/inversify.config';
import { ITipiCache } from './TipiCache';

export const tipiCache = container.get<ITipiCache>('ITipiCache');
