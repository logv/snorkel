it('defaults to no landing page', () => {
  cy.visit('/')
  cy.get('#email')
  cy.location('href').should('include', '/login')
})

it('lets you login with a test user', () => {
  cy.visit('/login')

  cy.get('#email')
    .type('test')
  cy.get('#password')
    .type('me')

  cy.get('form #submit').click()

  cy.location('href').should('include', '/datasets')
  cy.get(".superset")
})

it('lets you load the query page and run a query', () => {
  cy.visit('/login')

  cy.get('#email')
    .type('test')
  cy.get('#password')
    .type('me')

  cy.get('form #submit').click()
  cy.visit('/query?table=slite@ingest');

  cy.get('div.btn.go:first').click();
  cy.get('.results table')
});
