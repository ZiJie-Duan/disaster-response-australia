import React from 'react';
import RootLayout from '@/app/layout';

describe('RootLayout', () => {
  it('wraps content with html and body shells', () => {
    const element = RootLayout({ children: React.createElement('div', { id: 'inner' }, 'Content') });

    expect(element.type).toBe('html');
    expect(element.props.lang).toBe('en');

    const body = React.Children.only(element.props.children) as React.ReactElement;
    expect(body.type).toBe('body');
    expect(body.props.className).toContain('geist-sans');
    expect(body.props.children.props.id).toBe('inner');
  });
});
