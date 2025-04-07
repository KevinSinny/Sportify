describe('TransferMarket Page', () => {
  it('Filters transfers by league', () => {
    cy.intercept(
      {
        method: 'GET',
        url: 'http://localhost:5000/api/transfers/filter*',
        query: {
          league: 'Bundesliga'
        }
      },
      { fixture: 'bundesligaTransfers.json' }
    ).as('getTransfers');

    cy.visit('/transfer-market');

    cy.get('select').first().select('Bundesliga');
    cy.get('button').contains('Search').click();

    cy.wait('@getTransfers');
    cy.get('.transfer-card').should('have.length',2);
    cy.contains('Mathijs de Ligt').should('be.visible');
  });

  it('Should load the page correctly', () => {
    cy.visit('/transfer-market'); // NOTE: path fixed to match route
    cy.log('Visited Transfer Market page');
    cy.get('h2').should('contain', 'Transfer Market');
  });
});
