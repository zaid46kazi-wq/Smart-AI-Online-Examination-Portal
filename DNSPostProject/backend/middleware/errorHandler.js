/**
 * Global Error Handler Middleware
 */
function errorHandler(err, req, res, _next) {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'An internal server error occurred'
        : err.message;

    if (req.path.startsWith('/api/')) {
        return res.status(statusCode).json({
            error: message,
            timestamp: new Date().toISOString()
        });
    }

    res.status(statusCode).send(`
        <div style="font-family:sans-serif;text-align:center;padding:60px;">
            <h1 style="color:#EF4444;">Error ${statusCode}</h1>
            <p style="color:#6B7280;">${message}</p>
            <a href="/" style="color:#4F46E5;">Return Home</a>
        </div>
    `);
}

module.exports = { errorHandler };
