import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('renders nothing when totalPages <= 1', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows current page and total', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByText('2 of 5')).toBeInTheDocument();
  });

  it('disables Previous on first page', () => {
    render(<Pagination page={1} totalPages={3} onPageChange={() => {}} />);
    expect(screen.getByText('Previous')).toBeDisabled();
  });

  it('disables Next on last page', () => {
    render(<Pagination page={3} totalPages={3} onPageChange={() => {}} />);
    expect(screen.getByText('Next')).toBeDisabled();
  });

  it('calls onPageChange with page - 1 for Previous', async () => {
    const onChange = vi.fn();
    render(<Pagination page={3} totalPages={5} onPageChange={onChange} />);
    await userEvent.click(screen.getByText('Previous'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange with page + 1 for Next', async () => {
    const onChange = vi.fn();
    render(<Pagination page={3} totalPages={5} onPageChange={onChange} />);
    await userEvent.click(screen.getByText('Next'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('enables both buttons on middle page', () => {
    render(<Pagination page={2} totalPages={3} onPageChange={() => {}} />);
    expect(screen.getByText('Previous')).not.toBeDisabled();
    expect(screen.getByText('Next')).not.toBeDisabled();
  });
});
