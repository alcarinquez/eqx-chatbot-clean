module.exports = async function (context, req) {
    context.log('HTTP trigger function processed a request.');

    // Get the query parameter from the request
    const userInputQuestion = req.query.user_input_question;

    if (!userInputQuestion) {
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
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
            },
        });

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
        context.log.error('API Error:', error);
        
        let errorMessage = 'Something went wrong. Please try again later.';
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Could not reach the API server.';
        } else if (error.message.includes('HTTP error')) {
            errorMessage = `Server error: ${error.message}`;
        }

        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: errorMessage })
        };
    }
};
