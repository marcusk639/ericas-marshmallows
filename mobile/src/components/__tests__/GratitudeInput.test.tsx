import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import GratitudeInput from '../GratitudeInput';

describe('GratitudeInput', () => {
  it('should render with placeholder', () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = render(
      <GratitudeInput value="" onChange={onChange} />
    );

    expect(getByPlaceholderText("What are you grateful for today?")).toBeTruthy();
  });

  it('should call onChange when text changes', () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = render(
      <GratitudeInput value="" onChange={onChange} />
    );

    const input = getByPlaceholderText("What are you grateful for today?");
    fireEvent.changeText(input, 'Grateful for sunshine');

    expect(onChange).toHaveBeenCalledWith('Grateful for sunshine');
  });

  it('should display current value', () => {
    const onChange = jest.fn();
    const { getByDisplayValue } = render(
      <GratitudeInput value="Test gratitude" onChange={onChange} />
    );

    expect(getByDisplayValue('Test gratitude')).toBeTruthy();
  });

  it('should show character count', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <GratitudeInput value="Hello" onChange={onChange} />
    );

    expect(getByText('5/500')).toBeTruthy();
  });

  it('should enforce max length of 500 characters', () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = render(
      <GratitudeInput value="" onChange={onChange} />
    );

    const input = getByPlaceholderText("What are you grateful for today?");
    expect(input.props.maxLength).toBe(500);
  });
});
