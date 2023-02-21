/// <reference types="cypress" />

import { CanCheckAvailability } from "./interfaces";

export class LdesWorkbenchNiFi implements CanCheckAvailability{

    constructor(private baseUrl: string) {
    }

    /**
     * Checks if the Apache NiFi workbench is ready to accept login attempts
     * @returns true if ready, false otherwise
     */
    private isReady(): Cypress.Chainable<boolean> {
        return cy.exec(`curl --insecure ${this.baseUrl}/nifi`, { failOnNonZeroExit: false }).then(exec => exec.code === 0);
    }

    waitAvailable() {
        return cy.waitUntil(() => this.isReady(), { timeout: 600000, interval: 5000 });
    }

    logon(credentials: { username: string; password: string; }) {
        const loaded = 'flowClusterSummary';
        return cy.intercept(`${this.baseUrl}/nifi-api/flow/cluster/summary`).as(loaded)
            .visit(`${this.baseUrl}/nifi/login`)
            .get('#username').type(credentials.username)
            .get('#password').type(credentials.password)
            .get('#login-submission-button').click().wait(`@${loaded}`);
    }

    uploadWorkflow(file: string) {
        cy.intercept('**/upload').as('upload');

        cy.get('#splash').should('not.be.visible');
       
        cy.get("#group-component")
            .trigger("mousedown", 1, 1, {
                button: 0,
                force: true,
                eventConstructor: "MouseEvent"
            })
            .trigger("mousemove", 200, 200, {
                button: 0,
                force: true,
                eventConstructor: "MouseEvent"
            })
            .trigger("mouseup", 200, 200, {
                button: 0,
                force: true,
                eventConstructor: "MouseEvent"
            });

        return cy.readFile(file, null).then(buffer => {
            cy.get('#upload-file-field').selectFile({
                contents: buffer,
                fileName: 'nifi-workflow.json',
                mimeType: 'application/json',
                lastModified: Date.now(),
            }, {force: true});
            cy.get('#new-process-group-dialog > .dialog-buttons > div').first().click({force: true});
            return cy.wait('@upload').then(upload => {
                const processGroupId = upload.response.body.id;
                return cy.get('#operation-context-id').should('have.text', processGroupId);
            });
        });
    }

    pushStart() {
        cy.get('#operate-start').click();
    }
}