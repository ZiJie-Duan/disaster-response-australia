import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DisasterAreaManagementPage from '@/app/management/page';

const mapToggle = { editableValue: false };

jest.mock('@/app/components/map', () => ({
  __esModule: true,
  default: ({ editable }: { editable: boolean }) => {
    mapToggle.editableValue = editable;
    return React.createElement('div', { 'data-testid': 'management-map', 'data-editable': editable });
  },
}));

describe('DisasterAreaManagementPage', () => {
  it('renders management layout and toggles edit mode', async () => {
    const user = userEvent.setup();
    render(<DisasterAreaManagementPage />);

    expect(screen.getByText(/management system/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create disaster area/i })).toBeInTheDocument();
    expect(screen.getByText(/no area data available/i)).toBeInTheDocument();
    expect(screen.getByTestId('management-map')).toBeInTheDocument();
    expect(mapToggle.editableValue).toBe(false);

    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(mapToggle.editableValue).toBe(true);
  });

  it('renders provided data and device bubble', () => {
    render(
      <DisasterAreaManagementPage
        initialData={{
          areas: [
            { id: 'area-1', name: 'Area One', status: 'Active Disaster' },
            { id: 'area-2', name: 'Area Two', status: 'Resolved' },
          ],
          areaDetails: {
            areaName: 'Area One',
            disasterType: 'Flood',
            affectedPopulation: 1200,
            rescuersDeployed: '32',
          },
          verifiedDevices: [{ id: 99, verified: true, note: 'Checked in' }],
        }}
      />
    );

    expect(screen.getByRole('button', { name: /area one/i })).toBeInTheDocument();
    expect(screen.getByText(/flood/i)).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /verified device/i })).toBeInTheDocument();
  });

});
