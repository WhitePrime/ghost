const should = require('should');
const errors = require('@tryghost/errors');

describe('Errors', function () {
    it('Ensure we inherit from Error', function () {
        const ghostError = new errors.GhostError();
        (ghostError instanceof Error).should.eql(true);
    });

    describe('Inherite from other error', function () {
        it('default', function () {
            const someError = new Error();
            let ghostError;

            someError.message = 'test';
            someError.context = 'test';
            someError.help = 'test';

            ghostError = new errors.GhostError({err: someError});
            ghostError.stack.should.match(/Error: test/);
            ghostError.context.should.eql(someError.context);
            ghostError.help.should.eql(someError.help);
        });

        it('has nested object', function () {
            const someError = new Error();
            let ghostError;

            someError.obj = {
                a: 'b'
            };

            ghostError = new errors.GhostError({
                err: someError
            });

            ghostError.obj.should.eql(someError.obj);
        });

        it('with custom attribute', function () {
            const someError = new Error();
            let ghostError;

            someError.context = 'test';

            ghostError = new errors.GhostError({
                err: someError,
                context: 'context'
            });

            ghostError.context.should.eql('test');
        });

        it('with custom attribute', function () {
            const someError = new Error();
            let ghostError;

            ghostError = new errors.GhostError({
                err: someError,
                message: 'test'
            });

            ghostError.message.should.eql('test');
        });

        it('error is string', function () {
            const ghostError = new errors.GhostError({
                err: 'string'
            });

            ghostError.stack.should.match(/Error: string/);
        });
    });
});
