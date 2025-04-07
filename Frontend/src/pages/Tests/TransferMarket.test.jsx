import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import TransferMarket from '../TransferMarket/TransferMarket';

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () =>
        Promise.resolve([
          {
            player_name: 'Matthijs de Ligt',
            from_team: 'Juventus',
            to_team: 'Bayern Munich',
            age: 23,
            fee: '€70M',
            league_name: 'Bundesliga',
            year_of_transfer: 2022,
            position: 'Defender',
            type_of_transfer: 'Permanent',
          },
        ]),
    })
  );
});

afterEach(() => {
  jest.clearAllMocks();
});

test('renders TransferMarket component and displays Matthijs de Ligt transfer', async () => {
  render(<TransferMarket />);

  expect(screen.getByText('Transfer Market')).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText(/Matthijs de Ligt/i)).toBeInTheDocument();
    expect(screen.getByText(/To: Bayern Munich/i)).toBeInTheDocument();
    expect(screen.getByText(/From: Juventus/i)).toBeInTheDocument();
    expect(screen.getByText(/Fee: €70M/i)).toBeInTheDocument();
    expect(screen.getByText(/Position: Defender/i)).toBeInTheDocument();
  });
});
