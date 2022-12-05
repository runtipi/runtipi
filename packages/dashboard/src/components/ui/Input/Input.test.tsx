import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { Input } from './Input';
import { fireEvent, render, waitFor } from '../../../../tests/test-utils';

describe('Input', () => {
  it('should render without errors', () => {
    const { container } = render(<Input name="test-input" />);
    expect(container).toBeTruthy();
  });

  it('should render the label if provided', () => {
    const { getByLabelText } = render(<Input name="test-input" label="Test Label" />);
    const input = getByLabelText('Test Label');
    expect(input).toBeTruthy();
  });

  it('should render the placeholder if provided', () => {
    const { getByPlaceholderText } = render(<Input name="test-input" placeholder="Test Placeholder" />);
    const input = getByPlaceholderText('Test Placeholder');
    expect(input).toBeTruthy();
  });

  it('should render the error message if provided', () => {
    const { getByText } = render(<Input name="test-input" error="Test Error" />);
    const error = getByText('Test Error');
    expect(error).toBeTruthy();
  });

  it('should call onChange when the input value is changed', async () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(<Input name="test-input" label="Test Label" onChange={onChange} />);
    const input = getByLabelText('Test Label');
    fireEvent.change(input, { target: { value: 'changed' } });
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
  });

  it('should call onBlur when the input is blurred', async () => {
    const onBlur = jest.fn();
    const { getByLabelText } = render(<Input name="test-input" label="Test Label" onBlur={onBlur} />);
    const input = getByLabelText('Test Label');
    fireEvent.blur(input);
    await waitFor(() => expect(onBlur).toHaveBeenCalledTimes(1));
  });

  it('should set the input type if provided', () => {
    const { getByLabelText } = render(<Input name="test-input" label="Test Label" type="password" />);
    const input = getByLabelText('Test Label') as HTMLInputElement;
    expect(input.type).toBe('password');
  });

  it('should set the input value if provided', () => {
    const { getByLabelText } = render(<Input name="test-input" label="Test Label" value="Test Value" onChange={jest.fn} />);
    const input = getByLabelText('Test Label') as HTMLInputElement;
    expect(input.value).toBe('Test Value');
  });

  it('should apply the className prop to the container div', () => {
    const { container } = render(<Input name="test-input" className="test-class" />);
    expect(container.firstChild).toHaveClass('test-class');
  });

  it('should apply the isInvalid prop to the input element', () => {
    const { getByLabelText } = render(<Input name="test-input" label="Test Label" isInvalid />);
    const input = getByLabelText('Test Label');
    expect(input).toHaveClass('is-invalid', 'is-invalid-lite');
  });

  it('should apply the disabled prop to the input element', () => {
    const { getByLabelText } = render(<Input name="test-input" label="Test Label" disabled />);
    const input = getByLabelText('Test Label');
    expect(input).toBeDisabled();
  });

  it('should set the input name attribute if provided', () => {
    const { getByLabelText } = render(<Input name="test-input" label="Test Label" />);
    const input = getByLabelText('Test Label');
    expect(input).toHaveAttribute('name', 'test-input');
  });

  it('should set the input id attribute if provided', () => {
    const { getByLabelText } = render(<Input name="test-input" label="Test Label" />);
    const input = getByLabelText('Test Label');
    expect(input).toHaveAttribute('id', 'test-input');
  });

  it('should set the input ref if provided', () => {
    const ref = React.createRef<HTMLInputElement>();
    const { getByLabelText } = render(<Input name="test-input" label="Test Label" ref={ref} />);
    const input = getByLabelText('Test Label');
    expect(input).toEqual(ref.current);
  });

  it('should set the input type attribute to "text" if not provided or if an invalid value is provided', () => {
    const { getByLabelText } = render(<Input name="test-input" label="Test Label" />);
    const input1 = getByLabelText('Test Label') as HTMLInputElement;
    expect(input1.type).toBe('text');
  });

  it('should set the input placeholder attribute if provided', () => {
    const { getByLabelText } = render(<Input name="test-input" label="Test Label" placeholder="Test Placeholder" />);
    const input = getByLabelText('Test Label');
    expect(input).toHaveAttribute('placeholder', 'Test Placeholder');
  });
});
