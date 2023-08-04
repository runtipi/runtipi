import { faker } from '@faker-js/faker';
import React from 'react';
import { render } from '../../../../../tests/test-utils';
import { SystemRouterOutput } from '../../../../server/routers/system/system.router';
import { DashboardContainer } from './DashboardContainer';

describe('Test: Dashboard', () => {
  it('should render', () => {
    const data: SystemRouterOutput['systemInfo'] = {
      disk: {
        available: faker.number.int(),
        total: faker.number.int(),
        used: faker.number.int(),
      },
      memory: {
        available: faker.number.int(),
        total: faker.number.int(),
        used: faker.number.int(),
      },
      cpu: {
        load: faker.number.int(),
      },
    };

    render(<DashboardContainer data={data} isLoading={false} />);
  });
});
