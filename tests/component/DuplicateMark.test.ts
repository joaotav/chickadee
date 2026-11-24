import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import DuplicateMark from '@/components/DuplicateMark.svelte';

const places = ['💼 Work › Docs', 'Home › Media'];

describe('DuplicateMark', () => {
  it('says how many times the link is saved', () => {
    render(DuplicateMark, { places });
    const mark = screen.getByRole('button', { name: 'Saved 3 times' });
    expect(mark).toHaveAttribute('title', 'Saved 3 times');
    expect(mark).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Also saved in')).toBeNull();
  });

  it('lists the other places when clicked, and closes on a second click', async () => {
    render(DuplicateMark, { places });
    const mark = screen.getByRole('button', { name: 'Saved 3 times' });
    await fireEvent.click(mark);
    expect(mark).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Also saved in')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(places);
    await fireEvent.click(mark);
    expect(screen.queryByText('Also saved in')).toBeNull();
  });

  it('closes on a press outside, or on Escape with focus back on the mark', async () => {
    render(DuplicateMark, { places });
    const mark = screen.getByRole('button', { name: 'Saved 3 times' });
    await fireEvent.click(mark);
    await fireEvent.pointerDown(document.body);
    expect(screen.queryByText('Also saved in')).toBeNull();
    await fireEvent.click(mark);
    mark.blur();
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Also saved in')).toBeNull();
    expect(mark).toHaveFocus();
  });
});
