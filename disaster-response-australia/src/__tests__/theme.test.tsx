import { render, screen } from '@testing-library/react';
import React from 'react';

function Title() {
  return <h1 className="text-foreground">Disaster Response</h1>;
}

describe('Title component', () => {
  it('renders title text', () => {
    render(<Title />);
    expect(screen.getByRole('heading', { name: /disaster response/i })).toBeInTheDocument();
  });
});
