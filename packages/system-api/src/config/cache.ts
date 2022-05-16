import cache from 'node-cache';

const TipiCache = new cache({ stdTTL: 7200 });

export default TipiCache;
