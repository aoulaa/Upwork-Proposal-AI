export async function callGemini(apiKey, fields, ctx = {}, model = 'gemini-3.1-pro-preview') {
    // Load profile/project/rules data bundled with the extension
    const [profileRes, projectsRes, rulesRes] = await Promise.all([
        fetch(chrome.runtime.getURL('data/profile.json')),
        fetch(chrome.runtime.getURL('data/projects.json')),
        fetch(chrome.runtime.getURL('data/rules.json')),
    ]);

    const profile = await profileRes.json();
    const projects = await projectsRes.json();
    const rules = await rulesRes.json();

    // Build the system prompt from rules
    const systemInstruction = [
        rules.system_prompt,
        '',
        '--- VOICE & TONE ---',
        `Tone: ${rules.voice_attributes?.tone || 'Professional'}`,
        `Preferred CTA: ${rules.voice_attributes?.preferred_cta || 'Are you free for a quick chat today or tomorrow?'}`,
        `Signature: ${rules.voice_attributes?.signature || 'Best'}`,
        '',
        '--- BEST PRACTICES ---',
        ...(rules.freelance_best_practices || []).map((r, i) => `${i + 1}. ${r}`),
        '',
        '--- QUESTION ANSWERING GUIDELINE ---',
        rules.question_guidelines || '',
        '',
        '--- EXAMPLE TEMPLATE (Style Reference) ---',
        `Style: ${rules.example_template?.style || 'Direct'}`,
        'Content:',
        rules.example_template?.content || '',
        '',
        '--- OUTPUT FORMAT ---',
        'CRITICAL: Return ONLY a valid JSON object. NO markdown formatting like ```json.',
        'The JSON keys MUST exactly match the "label" values you receive in "fields_to_fill".',
    ].join('\n');

    // Build the user prompt — include job context for targeted AI responses
    const userPrompt = JSON.stringify({
        instructions: 'Analyze the job context and draft the requested fields. CRITICAL: 1) Start the cover letter IMMEDIATELY with a highly relevant project you built (from my_projects/experience) or a direct technical statement addressing the frameworks they requested. NO philosophical or high-level intros (e.g., "Building an AI SaaS requires..."). 2) Scan the job description for questions/requirements (e.g., rate/availability) and weave the answers NATURALLY into a paragraph. NO BULLET POINTS, CATEGORIES, OR SECTIONS. 3) Absolutely NO markdown formatting like asterisks (**). 4) Keep it strictly under 100-150 words.',
        job_context: {
            title: ctx.title || 'Unknown Job',
            description: ctx.description || '(no description — use job title as context)',
        },
        my_profile: profile,
        my_projects: projects,
        fields_to_fill: fields.map((f) => ({
            label: f.label,
            type: f.type || (f.index === 0 ? 'cover_letter' : 'screening_question'),
        })),
    }, null, 2);

    const body = {
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
            maxOutputTokens: 2048,
        },
    };

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }
    );

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini.');

    return JSON.parse(text);
}
