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

/**
 * Generate example sentences for a phrase in both English and German
 * Works bidirectionally - can start from either English or German phrase
 * @param {string} englishPhrase - The English phrase
 * @param {string} germanPhrase - The German phrase
 * @param {object} env - Environment variables
 * @returns {Promise<{exampleEnglish: string, exampleGerman: string}>}
 */
export async function generateExampleSentences(englishPhrase, germanPhrase, env = null) {
    const apiKey = env?.GEMINI_API_KEY || globalThis.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set');
    }

    const payload = {
        contents: [{
            parts: [{
                text: `Create natural example sentences for this phrase pair:
English: "${englishPhrase}"
German: "${germanPhrase}"

Requirements:
- Create ONE example sentence in English that uses "${englishPhrase}" naturally in context
- Create ONE example sentence in German that uses "${germanPhrase}" naturally in context
- Both sentences should convey similar meaning but don't need to be direct translations
- Make them complete, realistic, and conversational
- Keep them simple and easy to understand
- Return ONLY the two example sentences in this exact format:
ENGLISH: [your English example]
GERMAN: [your German example]

Do not include any other text, quotes, or explanations.`
            }]
        }]
    };

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
            const responseText = data.candidates[0].content.parts[0].text.trim();
            
            // Parse the response to extract English and German examples
            const englishMatch = responseText.match(/ENGLISH:\s*(.+?)(?=\nGERMAN:|$)/s);
            const germanMatch = responseText.match(/GERMAN:\s*(.+?)$/s);
            
            let exampleEnglish = englishMatch ? englishMatch[1].trim() : '';
            let exampleGerman = germanMatch ? germanMatch[1].trim() : '';
            
            // Remove any quotes that might be added
            exampleEnglish = exampleEnglish.replace(/^["']|["']$/g, '');
            exampleGerman = exampleGerman.replace(/^["']|["']$/g, '');
            
            // Fallback if parsing failed
            if (!exampleEnglish || !exampleGerman) {
                console.warn('Failed to parse example sentences, using fallback');
                exampleEnglish = `${englishPhrase}, I didn't expect to see you here!`;
                exampleGerman = `${germanPhrase}, ich habe nicht erwartet, dich hier zu sehen!`;
            }
            
            return {
                exampleEnglish,
                exampleGerman
            };
        } else {
            throw new Error('Unexpected response format from Gemini API');
        }
    } catch (error) {
        console.error('Error generating example sentences:', error);
        // Fallback to simple examples
        return {
            exampleEnglish: `${englishPhrase}, I didn't expect to see you here!`,
            exampleGerman: `${germanPhrase}, ich habe nicht erwartet, dich hier zu sehen!`
        };
    }
}
