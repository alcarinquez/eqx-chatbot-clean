module.exports = async function (context, req) {
    context.log('HTTP trigger function processed a request.');
    context.log('Request method:', req.method);
    context.log('Request query:', req.query);

    // Get the query parameter from the request
    const userInputQuestion = req.query.user_input_question;

    if (!userInputQuestion) {
        context.log('Missing user_input_question parameter');
        context.res = {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ error: 'Missing user_input_question parameter' })
        };
        return;
    }

    try {
        // Make the HTTP call to your container instance
        const apiUrl = `http://20.124.64.147:5001/GetChatbotResponse?user_input_question=${encodeURIComponent(userInputQuestion)}`;
        
        context.log(`Making request to: ${apiUrl}`);
        
        // Try using built-in fetch first, fallback to node-fetch if needed
        let response;
        try {
            // Check if fetch is available (Node 18+)
            if (typeof fetch !== 'undefined') {
                response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json, text/plain, */*',
                        'Content-Type': 'application/json',
                    },
                });
            } else {
                // Fallback to node-fetch for older runtimes
                const fetch = require('node-fetch');
                response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json, text/plain, */*',
                        'Content-Type': 'application/json',
                    },
                });
            }
        } catch (fetchError) {
            context.log.error('Fetch error:', fetchError);
            throw new Error(`Failed to make request: ${fetchError.message}`);
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }

        // Get the response as text first
        const responseText = await response.text();
        
        context.log(`Response length: ${responseText.length}`);
        context.log(`Response preview: ${responseText.substring(0, 200)}`);

        // Check if response is empty
        if (!responseText || responseText.trim() === '') {
            throw new Error('Empty response received from server');
        }

        // Handle different possible response structures
        let responseData = '';
        try {
            const parsedData = JSON.parse(responseText);
            
            // Check for common response field names
            if (parsedData && parsedData.message) {
                responseData = parsedData.message;
            } else if (parsedData && parsedData.response) {
                responseData = parsedData.response;
            } else if (parsedData && parsedData.answer) {
                responseData = parsedData.answer;
            } else if (typeof parsedData === 'string') {
                responseData = parsedData;
            } else if (parsedData) {
                responseData = JSON.stringify(parsedData);
            } else {
                responseData = 'No response data received';
            }
        } catch (jsonError) {
            context.log('Not JSON, using as text');
            // If JSON parsing fails, use the text as is
            responseData = responseText;
        }

        // Return the response in a consistent format
        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({ 
                message: typeof responseData === 'string' ? responseData : String(responseData || 'No response received')
            })
        };

    } catch (error) {
        context.log.error('API Error Details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        let errorMessage = `Error: ${error.message}`;
        if (error.message.includes('Failed to fetch') || error.message.includes('Failed to make request')) {
            errorMessage = `Network error: ${error.message}`;
        } else if (error.message.includes('HTTP error')) {
            errorMessage = `Server error: ${error.message}`;
        }

        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ 
                error: errorMessage,
                details: error.message // Include more details for debugging
            })
        };
    }
};
