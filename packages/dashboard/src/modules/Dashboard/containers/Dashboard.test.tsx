import { faker } from '@faker-js/faker';
import React from 'react';
import { render } from '../../../../tests/test-utils';
import { SystemInfoResponse } from '../../../generated/graphql';
import Dashboard from './Dashboard';

describe('Test: Dashboard', () => {
  it('should render', () => {
    const data: SystemInfoResponse = {
      disk: {
        available: faker.datatype.number(),
        total: faker.datatype.number(),
        used: faker.datatype.number(),
      },
      memory: {
        available: faker.datatype.number(),
        total: faker.datatype.number(),
        used: faker.datatype.number(),
      },
      cpu: {
        load: faker.datatype.number(),
      },
    };

    render(<Dashboard data={data} />);
  });
});
