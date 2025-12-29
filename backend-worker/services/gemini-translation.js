/**
 * Translate text using Google Gemini via native fetch
 * @param {string} text - The text to translate
 * @param {string} targetLang - The target language (e.g., 'German' or 'English')
 * @returns {Promise<string>} The translated text
 */
async function translateWithGeminiApi(text, targetLang = 'German', env = null) {
    const apiKey = env?.GEMINI_API_KEY || globalThis.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set');
    }

    const payload = {
        contents: [{
            parts: [{
                text: `Translate the following text to ${targetLang}. Only return the translated text without any explanation or markdown formatting: "${text}"`
            }]
        }]
    };

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
        console.log('[DEBUG] Gemini API URL:', url);
        const response = await fetch(
            url,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify(payload)
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `HTTP error! status: ${response.status}`);
        }

        // For non-streaming response, parse JSON directly
        const data = await response.json();
        console.log('[DEBUG] API Response:', JSON.stringify(data, null, 2));
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
            const translatedText = data.candidates[0].content.parts[0].text;
            console.log('[DEBUG] Extracted text:', translatedText);
            return translatedText.trim();
        } else {
            throw new Error('Unexpected response format from Gemini API');
        }
    } catch (error) {
        console.error('Gemini API error:', error);
        throw error;
    }
}

export async function translateWithGemini(text, env = null) {
    return translateWithGeminiApi(text, 'German', env);
}

export async function translateToEnglish(text, env = null) {
    return translateWithGeminiApi(text, 'English', env);
}
