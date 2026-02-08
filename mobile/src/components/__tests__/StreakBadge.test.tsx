import React from 'react';
import { render } from '@testing-library/react-native';
import StreakBadge from '../StreakBadge';

describe('StreakBadge', () => {
  it('should display fire emoji and streak count', () => {
    const { getByText } = render(<StreakBadge streak={5} />);

    expect(getByText('🔥')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
  });

  it('should display zero streak', () => {
    const { getByText } = render(<StreakBadge streak={0} />);

    expect(getByText('🔥')).toBeTruthy();
    expect(getByText('0')).toBeTruthy();
  });

  it('should display large streak numbers', () => {
    const { getByText } = render(<StreakBadge streak={365} />);

    expect(getByText('🔥')).toBeTruthy();
    expect(getByText('365')).toBeTruthy();
  });
});
