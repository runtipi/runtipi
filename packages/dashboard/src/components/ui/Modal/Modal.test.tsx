import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render } from '../../../../tests/test-utils';
import { Modal } from './Modal';
import { ModalBody } from './ModalBody';
import { ModalFooter } from './ModalFooter';
import { ModalHeader } from './ModalHeader';

describe('Modal component', () => {
  it('should render without errors', () => {
    const { container } = render(
      <Modal onClose={() => {}}>
        <p>Test modal content</p>
      </Modal>,
    );
    expect(container).toBeTruthy();
  });

  it('should not be visible by default', () => {
    const { queryByTestId } = render(
      <Modal onClose={() => {}}>
        <p>Test modal content</p>
      </Modal>,
    );
    // display should be none
    expect(queryByTestId('modal')).toHaveStyle('display: none');
  });

  it('should be visible when `isOpen` prop is true', () => {
    const { getByTestId } = render(
      <Modal onClose={() => {}} isOpen>
        <p>Test modal content</p>
      </Modal>,
    );
    // display should be block
    expect(getByTestId('modal')).toHaveStyle('display: block');
  });

  it('should not be visible when `isOpen` prop is false', () => {
    const { queryByTestId } = render(
      <Modal onClose={() => {}}>
        <p>Test modal content</p>
      </Modal>,
    );
    expect(queryByTestId('modal')).toHaveStyle('display: none');
  });

  it('should call the `onClose` prop when the close button is clicked', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <Modal onClose={onClose} isOpen>
        <p>Test modal content</p>
      </Modal>,
    );
    fireEvent.click(getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should call the `onClose` callback when user clicks outside of the modal', () => {
    const onClose = jest.fn();
    const { container } = render(
      <Modal onClose={onClose} isOpen>
        <p>Test modal content</p>
      </Modal>,
    );
    fireEvent.click(container);
    expect(onClose).toHaveBeenCalled();
  });

  it('should have the correct `size` class when the `size` prop is passed', () => {
    const { getByTestId } = render(
      <Modal onClose={() => {}} isOpen size="sm">
        <p>Test modal content</p>
      </Modal>,
    );
    expect(getByTestId('modal')).toHaveClass('modal-sm');
  });

  it('should have the correct `type` class when the `type` prop is passed', () => {
    const { getByTestId } = render(
      <Modal onClose={() => {}} isOpen type="primary">
        <p>Test modal content</p>
      </Modal>,
    );
    expect(getByTestId('modal-status')).toHaveClass('bg-primary');
    expect(getByTestId('modal-status')).not.toHaveClass('d-none');
  });

  it('should render the modal content as a child of the modal', () => {
    const { getByTestId, getByText } = render(
      <Modal onClose={() => {}} isOpen>
        <p>Test modal content</p>
      </Modal>,
    );
    expect(getByTestId('modal')).toContainElement(getByText('Test modal content'));
  });

  it('should call the `onClose` callback when the escape key is pressed', () => {
    const onClose = jest.fn();
    render(
      <Modal onClose={onClose} isOpen>
        <p>Test modal content</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('should correctly render with ModalBody', () => {
    const { getByTestId } = render(
      <Modal onClose={() => {}} isOpen>
        <ModalBody>
          <p>Test modal content</p>
        </ModalBody>
      </Modal>,
    );
    expect(getByTestId('modal-body')).toBeInTheDocument();
  });

  it('should correctly render with ModalFooter', () => {
    const { getByTestId } = render(
      <Modal onClose={() => {}} isOpen>
        <ModalFooter>
          <p>Test modal content</p>
        </ModalFooter>
      </Modal>,
    );
    expect(getByTestId('modal-footer')).toBeInTheDocument();
  });

  it('should correctly render with ModalHeader', () => {
    const { getByTestId } = render(
      <Modal onClose={() => {}} isOpen>
        <ModalHeader>
          <p>Test modal content</p>
        </ModalHeader>
      </Modal>,
    );
    expect(getByTestId('modal-header')).toBeInTheDocument();
  });
});
