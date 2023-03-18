import { createAppConfig } from '../../../../../server/tests/apps.factory';
import { limitText, sortTable } from '../table.helpers';
import { AppTableData } from '../table.types';

describe('sortTable function', () => {
  const app = createAppConfig({ name: 'a', categories: ['social'] });
  const app2 = createAppConfig({ name: 'b', categories: ['network', 'automation'] });
  const app3 = createAppConfig({ name: 'c', categories: ['network'] });

  // Randomize the order of the apps
  const data: AppTableData = [app3, app, app2];

  it('should sort by name in ascending order', () => {
    const sortedData = sortTable({ data, direction: 'asc', col: 'name', search: '' });

    expect(sortedData).toEqual([app, app2, app3]);
  });

  it('should sort by name in descending order', () => {
    const sortedData = sortTable({ data, direction: 'desc', col: 'name', search: '' });

    expect(sortedData).toEqual([app3, app2, app]);
  });

  it('should filter by search term', () => {
    const sortedData = sortTable({ data, direction: 'asc', col: 'name', search: 'b' });

    expect(sortedData).toEqual([app2]);
  });

  it('should filter by category', () => {
    const sortedData = sortTable({ data, direction: 'asc', col: 'name', search: '', category: 'automation' });

    expect(sortedData).toEqual([app2]);
  });
});

describe('limitText function', () => {
  it('should limit the text to the given limit', () => {
    const limitedText = limitText('Lorem ipsum dolor sit amet', 10);

    expect(limitedText).toEqual('Lorem ipsu...');
  });

  it('should not limit the text if it is shorter than the limit', () => {
    const limitedText = limitText('Lorem ipsum dolor sit amet', 100);

    expect(limitedText).toEqual('Lorem ipsum dolor sit amet');
  });
});
