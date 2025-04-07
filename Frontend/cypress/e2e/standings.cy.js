describe('Standings Page', () => {
  beforeEach(() => {
    // Mock for the main test
    cy.intercept('GET', `${Cypress.env('apiUrl')}/standings/2021`, {
      fixture: 'premierLeagueStandings.json'
    }).as('getStandings');
    
    cy.visit('/standings');
  });

  it('Displays Premier League standings correctly', () => {
    // Verify loading state first
    cy.contains('Loading standings...').should('exist');
    
    // Wait for API response
    cy.wait('@getStandings');
    
    // Assert table content
    cy.get('.standings-table')
      .should('contain', 'Arsenal')
      .and('contain', '65');
      
    // Verify team logos are visible
    cy.get('.team-logo').should('have.length.at.least', 1);
  });

  it('Displays empty state when no data', () => {
    // Override the mock with empty response
    cy.intercept('GET', `${Cypress.env('apiUrl')}/standings/2021`, []);
    cy.reload();
    
    cy.contains('No standings available').should('exist');
  });
});