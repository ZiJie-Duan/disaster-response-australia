import React from 'react';
import { render, screen } from '@testing-library/react';
import RescuerConsolePage from '@/app/console/page';

jest.mock('@/app/components/map', () => ({
  __esModule: true,
  default: () => React.createElement('div', { 'data-testid': 'map-component' }),
}));

describe('RescuerConsolePage', () => {
  it('renders placeholder console layout', () => {
    render(<RescuerConsolePage />);

    expect(screen.getByRole('heading', { name: /rescuer console/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
    expect(screen.getByTestId('zone-select')).toBeDisabled();
    expect(screen.getByText(/geofence alerts/i)).toBeInTheDocument();
    expect(screen.getByText(/no alerts yet/i)).toBeInTheDocument();
  });

  it('renders provided zones and alerts', () => {
    render(
      <RescuerConsolePage
        initialData={{
          zones: ['Zone A', 'Zone B'],
          alerts: [
            { id: '1', deviceId: 42, message: 'Needs assistance' },
            { id: '2', deviceId: 7, message: 'Medical support' },
          ],
          stats: {
            deviceCount: 12,
            affectedPopulation: 340,
            lastUpdatedLabel: 'Just now',
          },
        }}
      />
    );

    const select = screen.getByTestId('zone-select') as HTMLSelectElement;
    expect(select.disabled).toBe(false);
    expect(select.options[0].value).toBe('Zone A');
    expect(screen.getByText(/device id 42/i)).toBeInTheDocument();
    expect(screen.getByText(/medical support/i)).toBeInTheDocument();
    expect(screen.getByText(/just now/i)).toBeInTheDocument();
  });
});
