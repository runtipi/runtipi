import { faker } from '@faker-js/faker';
import React from 'react';
import { render } from '../../../../../tests/test-utils';
import { SystemRouterOutput } from '../../../../server/routers/system/system.router';
import { DashboardContainer } from './DashboardContainer';

describe('Test: Dashboard', () => {
  it('should render', () => {
    const data: SystemRouterOutput['systemInfo'] = {
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

    render(<DashboardContainer data={data} />);
  });
});
