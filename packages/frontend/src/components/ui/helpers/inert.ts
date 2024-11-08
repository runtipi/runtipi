import * as React from 'react';

// "inert" works differently between React versions
// https://github.com/facebook/react/pull/24730
export const inert = Number.parseFloat(React.version) >= 19 || '';
