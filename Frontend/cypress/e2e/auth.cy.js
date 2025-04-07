describe("Authentication API", () => {
    const baseUser = {
      username: "testuser",
      password: "TestPass123",
      profile_picture: "",
      is_admin: 0
    };
  
    const testUser = {
      ...baseUser,
      email: `testuser_${Date.now()}@example.com` // ✅ unique email per test run
    };
  
    const frontendUser = {
      username: "frontenduser",
      email: `frontenduser_${Date.now()}@example.com`, // ✅ unique email
      password: "Frontend123",
    };
  
    // BACKEND TESTS
    it("should register a new user", () => {
      cy.request({
        method: "POST",
        url: "http://localhost:5000/api/signup",
        body: testUser,
        failOnStatusCode: false
      }).then((response) => {
        cy.log(`Signup Response Status: ${response.status}`);
        cy.log(`Signup Response Body: ${JSON.stringify(response.body)}`);
  
        expect([200, 201, 409]).to.include(response.status);
        if (response.status === 201) {
          expect(response.body.message.toLowerCase()).to.include("user registered");
        } else if (response.status === 409) {
          cy.log("⚠️ User already exists");
          expect(response.body.message.toLowerCase()).to.include("already exists");
        }
      });
    });
  
    it("should log in with correct credentials and receive a token", () => {
      cy.request({
        method: "POST",
        url: "http://localhost:5000/api/login",
        body: {
          email: testUser.email,
          password: testUser.password
        },
        failOnStatusCode: false
      }).then((response) => {
        cy.log(`Login Response Status: ${response.status}`);
        cy.log(`Login Response Body: ${JSON.stringify(response.body)}`);
  
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property("token");
        expect(response.body).to.have.property("user");
        expect(response.body.user.email).to.eq(testUser.email);
      });
    });
  
    it("should fail login with incorrect password", () => {
      cy.request({
        method: "POST",
        url: "http://localhost:5000/api/login",
        body: {
          email: testUser.email,
          password: "WrongPass"
        },
        failOnStatusCode: false
      }).then((response) => {
        cy.log(`Failed Login Response Status: ${response.status}`);
        cy.log(`Failed Login Response Body: ${JSON.stringify(response.body)}`);
  
        expect(response.status).to.eq(401);
        expect(response.body.message.toLowerCase()).to.include("invalid email or password");
      });
    });
  
    // FRONTEND UI TESTS
  
    beforeEach(() => {
      cy.request({
        method: "GET",
        url: "http://localhost:5173",
        failOnStatusCode: false
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 304]);
      });
    });
  
    it("should display the signup page and submit the form", () => {
      cy.visit("http://localhost:5173/signup", { timeout: 10000 });
  
      cy.get('input[placeholder="Username"]').clear().type(frontendUser.username);
      cy.get('input[placeholder="Email"]').clear().type(frontendUser.email);
      cy.get('input[placeholder="Password"]').clear().type(frontendUser.password);
      cy.get('button[type="submit"]').click();
  
      cy.url().should("include", "/login");
      cy.contains("Login").should("exist");
    });
  
    it("should display the login page and log in successfully", () => {
      cy.visit("http://localhost:5173/login", { timeout: 10000 });
  
      cy.get('input[placeholder="Email"]').clear().type(frontendUser.email);
      cy.get('input[placeholder="Password"]').clear().type(frontendUser.password);
      cy.get('button[type="submit"]').click();
  
      cy.url().should("include", "/home");
  
      cy.window().then((win) => {
        const token = win.localStorage.getItem("token");
        expect(token, "Token should be present in localStorage").to.exist;
      });
    });
  });
  