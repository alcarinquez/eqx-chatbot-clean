module.exports = async function (context, req) {
    context.log('Test function called');
    
    context.res = {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            message: 'Test function is working!',
            timestamp: new Date().toISOString(),
            method: req.method,
            query: req.query
        })
    };
};
