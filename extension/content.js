// content.js — Injected into Upwork pages
// Handles: form scraping + smart form filling
// Built from analysis of real Upwork HTML (job-page.html, job-page-with-multiple-inputs.html)

// ─── Smart Insertion (React/Vue-compatible) ───────────────────────────────────
// Upwork uses Vue.js components. Standard `textarea.value = "..."` doesn't
// trigger Vue's reactivity. We must use the native value setter + dispatch events.
function setNativeValue(textarea, value) {
    // Vue/React intercept the property setter. We go to the prototype to bypass it.
    const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
    ).set;

    nativeSetter.call(textarea, value);

    // Fire all events Vue listens to for v-model binding
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
}

// ─── Label Extractor ─────────────────────────────────────────────────────────
// Real Upwork DOM pattern (confirmed from HTML analysis):
//
//  <div class="form-group mb-8x">
//    <label class="label" id="cover_letter_label">Cover Letter</label>
//    <div class="air3-textarea textarea-wrapper p-0">
//      <textarea class="air3-textarea inner-textarea" aria-labelledby="cover_letter_label"></textarea>
//    </div>
//  </div>
//
//  Screening questions use the same pattern but label id="" (empty for questions).
//
// The .cover-letter-area wraps the cover letter block.
// The .fe-proposal-job-questions wraps all screening questions.

function getLabelForTextarea(textarea) {
    // ── Strategy 1: aria-labelledby → find the label element by ID ───────────
    const labelledById = textarea.getAttribute('aria-labelledby');
    if (labelledById && labelledById.trim()) {
        const labelEl = document.getElementById(labelledById.trim());
        if (labelEl && labelEl.innerText.trim()) {
            return labelEl.innerText.trim();
        }
    }

    // ── Strategy 2: closest .form-group → find a <label class="label"> inside ─
    const formGroup = textarea.closest('.form-group');
    if (formGroup) {
        const labelEl = formGroup.querySelector('label.label, label.up-label, label');
        if (labelEl && labelEl.innerText.trim()) {
            return labelEl.innerText.trim();
        }
    }

    // ── Strategy 3: closest .air3-textarea.textarea-wrapper → go to parent → find label
    const wrapper = textarea.closest('.textarea-wrapper, .air3-textarea');
    if (wrapper && wrapper.parentElement) {
        const parent = wrapper.parentElement;
        // Check siblings or parent's label
        const labelEl = parent.querySelector('label');
        if (labelEl && labelEl.innerText.trim()) {
            return labelEl.innerText.trim();
        }
    }

    // ── Strategy 4: aria-label attribute directly on textarea ────────────────
    const ariaLabel = textarea.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

    // ── Strategy 5: placeholder ───────────────────────────────────────────────
    const placeholder = textarea.getAttribute('placeholder');
    if (placeholder && placeholder.trim()) return placeholder.trim();

    return null;
}

function detectFieldType(textarea, index) {
    // Cover letter is ALWAYS index 0 AND inside .cover-letter-area
    const inCoverLetterArea = !!textarea.closest('.cover-letter-area');
    if (index === 0 || inCoverLetterArea) return 'cover_letter';

    // Screening questions are inside .fe-proposal-job-questions or .questions-area
    const inQuestionsArea = !!(
        textarea.closest('.fe-proposal-job-questions') ||
        textarea.closest('.questions-area')
    );
    if (inQuestionsArea) return 'screening_question';

    return 'other';
}

// ─── Form Scraper ─────────────────────────────────────────────────────────────
function scrapeForm() {
    // Only target textareas inside the Upwork application form wrapper
    // The entire proposal form is inside .fe-job-apply
    const appForm = document.querySelector('.fe-job-apply, .fe-ui-application-vue');
    const scope = appForm || document;

    // Target the specific Upwork textarea class: air3-textarea inner-textarea
    // Fallback to any textarea if Upwork ever changes their classes
    let textareas = Array.from(
        scope.querySelectorAll('textarea.inner-textarea, textarea.air3-textarea')
    ).filter((el) => el.offsetParent !== null); // visible only

    // Ultimate fallback: all visible textareas in scope
    if (textareas.length === 0) {
        textareas = Array.from(scope.querySelectorAll('textarea')).filter(
            (el) => el.offsetParent !== null
        );
    }

    if (textareas.length === 0) {
        return {
            success: false,
            error:
                "No form fields found. Please navigate to an Upwork 'Submit a Proposal' page and try again.",
        };
    }

    const fields = textareas.map((textarea, index) => {
        const rawLabel = getLabelForTextarea(textarea);
        const type = detectFieldType(textarea, index);

        // Clean up label: collapse whitespace, strip trailing punctuation artifacts
        let label = rawLabel
            ? rawLabel.replace(/\s+/g, ' ').trim()
            : type === 'cover_letter'
                ? 'Cover Letter'
                : `Question ${index}`;

        return {
            index,
            label,
            type,          // 'cover_letter' | 'screening_question' | 'other'
            currentValue: textarea.value || '',
        };
    });

    // Also extract the job title and description for richer AI context
    const jobTitle = extractJobTitle();
    const jobDescription = extractJobDescription();

    return {
        success: true,
        fields,
        jobContext: { title: jobTitle, description: jobDescription },
    };
}

// ─── Job Context Extractors ───────────────────────────────────────────────────
// Real Upwork DOM: job title is in .fe-job-apply h1 or the page <h1>
function extractJobTitle() {
    const candidates = [
        document.querySelector('.fe-job-apply h1'),
        document.querySelector('h1[data-v-b39080ac]'),
        document.querySelector('h1'),
    ];
    for (const el of candidates) {
        if (el && el.innerText.trim()) return el.innerText.trim();
    }
    return document.title || '';
}

// Job description is harder — look for the job details section
function extractJobDescription() {
    // 1. Try to find and click ALL "more" buttons in the job details area
    const jobDetailsArea = document.querySelector('.fe-job-details, .fe-job-apply, [data-test="description"]')?.parentElement || document.body;
    const moreButtons = jobDetailsArea.querySelectorAll('.air3-truncation-btn, .up-truncation-label, button');

    for (const btn of moreButtons) {
        const text = btn.innerText.toLowerCase();
        if (text === 'more' || text.includes('view more') || text.includes('expand')) {
            try {
                btn.click();
            } catch (e) { }
        }
    }

    const candidates = [
        document.querySelector('[data-test="description"]'), // Best candidate
        document.querySelector('.description.text-body-sm'), // User's specific container
        document.querySelector('.job-description'),
        document.querySelector('.description'),
        document.querySelector('.air3-truncation'),
        document.querySelector('.up-card-section p'),
    ];

    for (const el of candidates) {
        if (!el) continue;

        let text = el.innerText.trim();

        // If the text still ends with an ellipsis or is very short, it's likely still truncated.
        // We'll try to find the parent or a sibling that might have the content.
        if (text.endsWith('…') || text.endsWith('...')) {
            // Check if there's a hidden or aria-hidden element with more content
            const hiddenContent = el.querySelector('[aria-hidden="true"], .sr-only, .hidden');
            if (hiddenContent && hiddenContent.innerText.length > text.length) {
                text = hiddenContent.innerText.trim();
            }
        }

        if (text.length > 50) { // Minimum threshold for a real description
            // Clean up common truncation noise
            text = text.replace(/Less about\s*$/i, '')
                .replace(/More\s*$/i, '')
                .replace(/More\/Less about\s*$/i, '');

            return text.slice(0, 8000);
        }
    }

    // Ultimate fallback: grab the largest text block in the job details section
    const detailsSection = document.querySelector('.fe-job-details');
    if (detailsSection) {
        return detailsSection.innerText.trim().slice(0, 8000);
    }

    return '';
}

// ─── Special Field Handlers ──────────────────────────────────────────────────
async function handleRateIncrease() {
    try {
        // Look for the "How often do you want a rate increase?" label
        const labels = Array.from(document.querySelectorAll('label, .up-label, p.text-dark'));
        const targetLabel = labels.find(l => l.innerText.includes('How often do you want a rate increase?'));

        if (!targetLabel) return;

        // The dropdown is usually a sibling or inside a parent container
        const container = targetLabel.closest('.mb-8x, .air3-form-card') || targetLabel.parentElement;
        const dropdown = container?.querySelector('.air3-dropdown');

        if (!dropdown) return;

        const toggle = dropdown.querySelector('[data-test="dropdown-toggle"]');
        if (!toggle) return;

        const currentLabel = toggle.querySelector('.air3-dropdown-toggle-label');
        if (currentLabel && currentLabel.innerText.trim() === 'Never') return;

        // Open the dropdown
        toggle.click();

        // Wait for the menu to animate in (Upwork uses portals for menus)
        await new Promise(r => setTimeout(r, 500));

        // Find the "Never" option in the document
        const items = Array.from(document.querySelectorAll('.air3-menu-item, [role="option"], .air3-dropdown-menu li'));
        const neverOption = items.find(i => i.innerText.trim() === 'Never');

        if (neverOption) {
            neverOption.click();
            console.log("Upwork Autopilot: Automatically set rate increase to 'Never'");
        }
    } catch (e) {
        console.error("Upwork Autopilot: Error setting rate increase:", e);
    }
}

// ─── Form Filler ─────────────────────────────────────────────────────────────
async function fillForm(fields) {
    const appForm = document.querySelector('.fe-job-apply, .fe-ui-application-vue');
    const scope = appForm || document;

    let textareas = Array.from(
        scope.querySelectorAll('textarea.inner-textarea, textarea.air3-textarea')
    ).filter((el) => el.offsetParent !== null);

    if (textareas.length === 0) {
        textareas = Array.from(scope.querySelectorAll('textarea')).filter(
            (el) => el.offsetParent !== null
        );
    }

    let filled = 0;
    const errors = [];

    for (const field of fields) {
        const textarea = textareas[field.index];
        if (!textarea) {
            errors.push(`Field ${field.index} ("${field.label}") not found in DOM.`);
            continue;
        }
        if (!field.generatedText) continue;

        try {
            textarea.focus();
            setNativeValue(textarea, field.generatedText);
            filled++;
        } catch (err) {
            errors.push(`Failed to fill field ${field.index}: ${err.message}`);
        }
    }

    // Automatically handle the rate increase frequency dropdown
    await handleRateIncrease();

    return {
        success: errors.length < fields.filter((f) => f.generatedText).length,
        filled,
        errors,
    };
}

// ─── Message Listener ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SCRAPE_FORM') {
        sendResponse(scrapeForm());
    }

    if (message.type === 'FILL_FORM') {
        fillForm(message.fields).then(sendResponse);
        return true; // Keep channel open for async response
    }
});

// ─── UI Indicator ────────────────────────────────────────────────────────────
function showAutopilotIndicator(status, message) {
    let indicator = document.getElementById('upwork-autopilot-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'upwork-autopilot-indicator';
        indicator.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #1e1e1e;
            color: #fff;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: inherit;
            font-weight: 500;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(indicator);
    }

    indicator.style.opacity = '1';

    let icon = '';
    if (status === 'loading') icon = '⏳';
    else if (status === 'success') icon = '✅';
    else if (status === 'error') icon = '❌';

    indicator.innerHTML = `${icon} <span>${message}</span>`;

    if (status !== 'loading') {
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 4000);
    }
}

// ─── Auto-Run Logic ─────────────────────────────────────────────────────────
let lastProcessedUrl = '';

async function autoRunAutopilot() {
    // Only run once per application page instance
    if (lastProcessedUrl === window.location.href) return;
    lastProcessedUrl = window.location.href;

    // PRE-CLICK: Try to expand descriptions before we even scrape
    try {
        const moreButtons = document.querySelectorAll('.air3-truncation-btn, .up-truncation-label');
        moreButtons.forEach(btn => {
            if (btn.innerText.toLowerCase().includes('more')) btn.click();
        });
        // Give the DOM a moment to update with the full text
        await new Promise(r => setTimeout(r, 500));
    } catch (e) { }

    showAutopilotIndicator('loading', 'AI is reading the job and generating your proposal...');

    const scrapeData = scrapeForm();
    if (!scrapeData.success) {
        showAutopilotIndicator('error', scrapeData.error);
        return;
    }

    chrome.runtime.sendMessage({
        type: "CALL_GEMINI",
        fields: scrapeData.fields,
        jobContext: scrapeData.jobContext
    }, (response) => {
        if (chrome.runtime.lastError || !response) {
            console.error('Autopilot Error:', chrome.runtime.lastError);
            showAutopilotIndicator('error', 'Error reaching background script or AI timeout.');
            return;
        }

        if (response.success) {
            fillForm(response.generatedFields).then(fillData => {
                if (fillData.success) {
                    showAutopilotIndicator('success', `Proposal generated! Filled ${fillData.filled} fields.`);
                } else {
                    showAutopilotIndicator('error', 'Generated, but failed to fill all fields.');
                }
            });
        } else {
            showAutopilotIndicator('error', response.error || 'Failed to generate proposal.');
        }
    });
}

// Watch for DOM changes to detect the form
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
            // Check if application form is on screen
            const formContainer = document.querySelector('.fe-job-apply, .fe-ui-application-vue');
            if (formContainer && lastProcessedUrl !== window.location.href) {
                // Ensure textareas are actually rendered before scraping
                const textareas = formContainer.querySelectorAll('textarea.inner-textarea, textarea.air3-textarea');
                if (textareas.length > 0) {
                    autoRunAutopilot();
                }
            }
        }
    }
});

observer.observe(document.body, { childList: true, subtree: true });

// Check immediately on load too
setTimeout(() => {
    const textareas = document.querySelectorAll('.fe-job-apply textarea, .fe-ui-application-vue textarea');
    if (textareas.length > 0) {
        autoRunAutopilot();
    }
}, 1000);
