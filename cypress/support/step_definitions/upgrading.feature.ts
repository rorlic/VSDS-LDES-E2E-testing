import { Given, Then, When } from "@badeball/cypress-cucumber-preprocessor";
import { mongo, setTargetUrl } from "./common_step_definitions";
import { Fragment } from "../ldes";

let lastMemberCount: number;

const commonFragmentProperties = ['_class', 'fragmentPairs', 'immutable', 'relations', 'root', 'viewName'];
const commonMemberProperties = ['_class'];
const fragmentCollectionUrl = 'http://localhost:9019/iow_devices/ldesfragment';
const memberCollectionUrl = 'http://localhost:9019/iow_devices/ldesmember';

function checkDatabaseStructure(collectionUrl: string, expected: string[],) {
    cy.exec(`curl '${collectionUrl}?includeDocuments=true' | jq '[.documents[] | keys] | flatten | unique | map(select(. != "_id"))'`, { failOnNonZeroExit: false })
        .then(result => {
            const actual = JSON.parse(result.stdout) as string[];
            expect(actual).to.have.same.members(expected);
        });
}

Given('the ldesfragment collection is structured as expected', () => {
    checkDatabaseStructure(fragmentCollectionUrl, [...commonFragmentProperties, 'members']);
})

Given('the ldesmember collection is structured as expected', () => {
    checkDatabaseStructure(memberCollectionUrl, [...commonMemberProperties, 'ldesMember']);
})

Then('the ldesfragment collection on the new server is structured as expected', () => {
    checkDatabaseStructure(fragmentCollectionUrl, 
        [...commonFragmentProperties, 'collectionName', 'immutableTimestamp', 'numberOfMembers', 'parentId', 'softDeleted']);
})

Then('the ldesmember collection on the new server is structured as expected', () => {
    checkDatabaseStructure(memberCollectionUrl, 
        [...commonMemberProperties, 'collectionName', 'model', 'sequenceNr', 'timestamp', 'treeNodeReferences', 'versionOf']);
})

When('I remember the last fragment member count', () => {
    mongo.fragments('iow_devices', 'ldesfragment')
        .then(fragments => fragments.pop())
        .then(partialUrl => new Fragment(`http://localhost:8080${partialUrl}`)
            .visit()
            .then(fragment => cy.log(`Member count: ${fragment.memberCount}`)
                .then(() => lastMemberCount = fragment.memberCount)
            )
        );
})

Then('the last fragment member count increases', () => {
    cy.waitUntil(() =>
        mongo.fragments('iow_devices', 'ldesfragment')
            .then(fragments => fragments.pop())
            .then(partialUrl => new Fragment(`http://localhost:8080${partialUrl}`)
                .visit()
                .then(fragment => cy.log(`New member count: ${fragment.memberCount}`)
                    .then(() => lastMemberCount < fragment.memberCount)
                )
            ),
        { timeout: 5000, interval: 1000 });
})

When('I set the TARGETURL to the old LDIO', () => {
    setTargetUrl("http://old-ldio:8080/pipeline");
})

When('I set the TARGETURL to the new LDIO', () => {
    setTargetUrl("http://new-ldio:8080/pipeline");
})
