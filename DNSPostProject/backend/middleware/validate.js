/**
 * Zod Express Validation Middleware
 */
const { ZodError } = require('zod');

function validate(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                const issues = err.issues.map(i => i.message).join(', ');
                return res.status(400).json({
                    error: `Validation error: ${issues}`,
                    details: err.issues
                });
            }
            next(err);
        }
    };
}

module.exports = { validate };
