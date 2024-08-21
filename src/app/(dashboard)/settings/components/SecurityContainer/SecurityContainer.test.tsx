import { describe, it } from 'vitest';
import { render } from '../../../../../../tests/test-utils';
import { SecurityContainer } from './SecurityContainer';

describe('<SecurityContainer />', () => {
  it('should render', () => {
    render(<SecurityContainer totpEnabled={false} />);
  });
});
