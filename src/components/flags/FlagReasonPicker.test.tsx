import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlagReasonPicker } from './FlagReasonPicker';
import type { FlagReason } from '@/types/enums';

describe('FlagReasonPicker', () => {
  it('renders three reason buttons', () => {
    render(<FlagReasonPicker onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('menuitem', { name: 'Offensive' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Plagiarized' })).toBeInTheDocument();
  });

  it('calls onSelect with "offensive" when Offensive is clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<FlagReasonPicker onSelect={onSelect} onClose={vi.fn()} />);
    await user.click(screen.getByRole('menuitem', { name: 'Offensive' }));
    expect(onSelect).toHaveBeenCalledWith('offensive' satisfies FlagReason);
  });

  it('calls onSelect with "duplicate" when Duplicate is clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<FlagReasonPicker onSelect={onSelect} onClose={vi.fn()} />);
    await user.click(screen.getByRole('menuitem', { name: 'Duplicate' }));
    expect(onSelect).toHaveBeenCalledWith('duplicate' satisfies FlagReason);
  });

  it('calls onSelect with "plagiarized" when Plagiarized is clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<FlagReasonPicker onSelect={onSelect} onClose={vi.fn()} />);
    await user.click(screen.getByRole('menuitem', { name: 'Plagiarized' }));
    expect(onSelect).toHaveBeenCalledWith('plagiarized' satisfies FlagReason);
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<FlagReasonPicker onSelect={vi.fn()} onClose={onClose} />);
    // The backdrop is the fixed inset-0 div with aria-hidden
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the menu with correct aria-label', () => {
    render(<FlagReasonPicker onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('menu', { name: 'Flag reason' })).toBeInTheDocument();
  });
});
