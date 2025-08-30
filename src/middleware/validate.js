'use strict';

function validate(schema, where = 'body') {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[where], { abortEarly: false, convert: true });
        if (error) return res.status(400).json({ error: 'validation_error', details: error.details.map(d => d.message) });
        req[where] = value;
        next();
    };
}

module.exports = { validate };
