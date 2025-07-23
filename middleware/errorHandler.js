const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');
const { JsonWebTokenError, TokenExpiredError } = require('jsonwebtoken');

class APIError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

class NotFoundError extends APIError {
    constructor(resource, id) {
        super(`${resource} with id ${id} not found`, 404, 'NOT_FOUND');
    }
}

class BadRequestError extends APIError {
    constructor(message = 'Bad Request', details = null) {
        super(message, 400, 'BAD_REQUEST', details);
    }
}

class UnauthorizedError extends APIError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

class ForbiddenError extends APIError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}

const errorHandler = (err, req, res, next) => {
    let error = {
        success: false,
        message: err.message || 'Internal Server Error',
        code: 'INTERNAL_SERVER_ERROR',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    };

    let statusCode = 500;

    if (err instanceof APIError) {
        statusCode = err.statusCode;
        error = {
            ...error,
            message: err.message,
            code: err.code,
            ...(err.details && { details: err.details })
        };
    } 
    else if (err instanceof ValidationError) {
        statusCode = 400;
        error = {
            ...error,
            message: 'Validation Error',
            code: 'VALIDATION_ERROR',
            details: err.errors.map(e => ({
                field: e.path,
                message: e.message,
                type: e.type,
                value: e.value
            }))
        };
    }
    else if (err instanceof UniqueConstraintError) {
        statusCode = 409;
        error = {
            ...error,
            message: 'Duplicate entry',
            code: 'DUPLICATE_ENTRY',
            details: err.errors.map(e => ({
                field: e.path,
                message: e.message,
                value: e.value
            }))
        };
    }
    else if (err instanceof ForeignKeyConstraintError) {
        statusCode = 400;
        error = {
            ...error,
            message: 'Invalid reference',
            code: 'INVALID_REFERENCE',
            details: {
                table: err.table,
                constraint: err.index,
                fields: err.fields
            }
        };
    }
    else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        error = {
            ...error,
            message: 'Invalid token',
            code: 'INVALID_TOKEN'
        };
    } 
    else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        error = {
            ...error,
            message: 'Token expired',
            code: 'TOKEN_EXPIRED'
        };
    }

    if (process.env.NODE_ENV === 'development') {
        console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
        console.error(err.stack);
    } else if (process.env.NODE_ENV === 'production') {
        console.error(`[${new Date().toISOString()}] ${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    }

    res.status(statusCode).json(error);
};

const notFoundHandler = (req, res, next) => {
    const error = new APIError(`Cannot ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND');
    next(error);
};

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    errorHandler,
    notFoundHandler,
    APIError,
    NotFoundError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    asyncHandler
};