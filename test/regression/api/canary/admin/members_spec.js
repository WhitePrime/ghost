const path = require('path');
const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const config = require('../../../../../core/server/config');
const labs = require('../../../../../core/server/services/labs');

const ghost = testUtils.startGhost;

let request;

describe('Members API', function () {
    before(function () {
        sinon.stub(labs, 'isSet').withArgs('members').returns(true);
    });

    after(function () {
        sinon.restore();
    });

    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request, 'member');
            });
    });

    it('Add should fail when passing incorrect email_type query parameter', function () {
        const member = {
            name: 'test',
            email: 'memberTestAdd@test.com'
        };

        return request
            .post(localUtils.API.getApiQuery(`members/?send_email=true&email_type=lel`))
            .send({members: [member]})
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(422);
    });

    // NOTE: this test should be enabled and expanded once test suite fully supports Stripe mocking
    it.skip('Can set a "Complimentary" subscription', function () {
        const memberToChange = {
            name: 'Comped Member',
            email: 'member2comp@test.com'
        };

        const memberChanged = {
            comped: true
        };

        return request
            .post(localUtils.API.getApiQuery(`members/`))
            .send({members: [memberToChange]})
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.members);
                jsonResponse.members.should.have.length(1);

                return jsonResponse.members[0];
            })
            .then((newMember) => {
                return request
                    .put(localUtils.API.getApiQuery(`members/${newMember.id}/`))
                    .send({members: [memberChanged]})
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .then((res) => {
                        should.not.exist(res.headers['x-cache-invalidate']);

                        const jsonResponse = res.body;

                        should.exist(jsonResponse);
                        should.exist(jsonResponse.members);
                        jsonResponse.members.should.have.length(1);
                        localUtils.API.checkResponse(jsonResponse.members[0], 'member', 'stripe');
                        jsonResponse.members[0].name.should.equal(memberToChange.name);
                        jsonResponse.members[0].email.should.equal(memberToChange.email);
                        jsonResponse.members[0].comped.should.equal(memberToChange.comped);
                    });
            });
    });

    it('Can import CSV with minimum one field', function () {
        return request
            .post(localUtils.API.getApiQuery(`members/csv/`))
            .attach('membersfile', path.join(__dirname, '/../../../../utils/fixtures/csv/valid-members-defaults.csv'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.meta);
                should.exist(jsonResponse.meta.stats);

                jsonResponse.meta.stats.imported.should.equal(2);
                jsonResponse.meta.stats.duplicates.should.equal(0);
                jsonResponse.meta.stats.invalid.should.equal(0);
            })
            .then(() => {
                return request
                    .get(localUtils.API.getApiQuery(`members/`))
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.members);

                const defaultMember1 = jsonResponse.members.find(member => (member.email === 'member+defaults_1@example.com'));
                should(defaultMember1.name).equal(null);
                should(defaultMember1.note).equal(null);
                defaultMember1.subscribed.should.equal(true);
                defaultMember1.comped.should.equal(false);
                defaultMember1.stripe.should.not.be.undefined();
                defaultMember1.stripe.subscriptions.length.should.equal(0);
                defaultMember1.labels.length.should.equal(0);

                const defaultMember2 = jsonResponse.members.find(member => (member.email === 'member+defaults_2@example.com'));
                should(defaultMember2).not.be.undefined();
            });
    });

    it('Can import file with duplicate stripe customer ids', function () {
        return request
            .post(localUtils.API.getApiQuery(`members/csv/`))
            .attach('membersfile', path.join(__dirname, '/../../../../utils/fixtures/csv/members-with-duplicate-stripe-ids.csv'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.meta);
                should.exist(jsonResponse.meta.stats);

                jsonResponse.meta.stats.imported.should.equal(1);
                jsonResponse.meta.stats.duplicates.should.equal(0);
                jsonResponse.meta.stats.invalid.should.equal(2);
            });
    });
});
