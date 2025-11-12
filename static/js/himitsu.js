class kanojoConnect {
    constructor() {
        this.loadData();
        
        // Initialize on DOM ready
        document.addEventListener('DOMContentLoaded', () => {
            this.initFields();
        });
    }

    loadData() {
        const saved = localStorage.getItem('yunaData');
        if (saved) {
            const data = JSON.parse(saved);
            this.memory = data.memory || '';
            this.shujinko = data.shujinko || '';
            this.aibo = data.aibo || '';
        } else {
            this.memory = '';
            this.shujinko = '';
            this.aibo = '';
        }
    }

    saveData() {
        const data = {
            memory: this.memory,
            shujinko: this.shujinko,
            aibo: this.aibo
        };
        localStorage.setItem('yunaData', JSON.stringify(data));
    }

    initFields() {
        // Get field references
        const memoryField = document.getElementById('kanojoMemory');
        const shujinkoField = document.getElementById('kanojoShujinko');
        const aiboField = document.getElementById('kanojoAibo');

        if (!memoryField || !shujinkoField || !aiboField) return;

        // Load initial values
        memoryField.value = this.memory;
        shujinkoField.value = this.shujinko;
        aiboField.value = this.aibo;

        // Auto-save on input
        memoryField.addEventListener('input', (e) => {
            this.memory = e.target.value;
            this.saveData();
        });

        shujinkoField.addEventListener('input', (e) => {
            this.shujinko = e.target.value;
            this.saveData();
        });

        aiboField.addEventListener('input', (e) => {
            this.aibo = e.target.value;
            this.saveData();
        });
    }

    buildPrompt() {
        let prompt = '<|begin_of_text|>\n';
        
        if (this.memory && this.memory.trim()) {
            prompt += `<memory>${this.memory.trim()}</memory>\n`;
        }
        
        if (this.shujinko && this.shujinko.trim()) {
            prompt += `<shujinko>${this.shujinko.trim()}</shujinko>\n`;
        }
        
        if (this.aibo && this.aibo.trim()) {
            prompt += `<aibo>${this.aibo.trim()}</aibo>\n`;
        }
        
        prompt += '<dialog>';
        
        return prompt;
    }

    // Keep Himitsu Tools functionality
    initHimitsuTools() {
        const wordCountInput = $('wordCountInput');
        wordCountInput?.addEventListener('input', this.analyzeWordCount.bind(this));
        
        this.analyzeWordCount();

        const citationInputs = document.querySelectorAll('#citationInputs input, #citationInputs select');
        citationInputs.forEach(input => input.addEventListener('input', this.updateCitationPreview.bind(this)));
        document.querySelectorAll('input[name="citationFormat"]').forEach(radio => radio.addEventListener('change', this.updateCitationPreview.bind(this)));
        $('sourceType')?.addEventListener('change', this.updateCitationPreview.bind(this));
        $('copyCitationButton')?.addEventListener('click', this.copyCitation);

        this.updateCitationPreview();
    }

    analyzeWordCount() {
        const text = $('wordCountInput')?.value || '';
        const stats = this.getTextStats(text);

        $('wc-words').textContent = stats.words;
        $('wc-chars-nospaces').textContent = stats.charsNoSpaces;
        $('wc-chars-spaces').textContent = stats.charsWithSpaces;
        $('wc-sentences').textContent = stats.sentences;
        $('wc-paragraphs').textContent = stats.paragraphs;
        $('wc-readtime').textContent = stats.readTime;
    }

    getTextStats(text) {
        if (!text) {
            return { words: 0, charsNoSpaces: 0, charsWithSpaces: 0, sentences: 0, paragraphs: 0, readTime: '0m 0s' };
        }

        const charsWithSpaces = text.length;
        const charsNoSpaces = text.replace(/\s/g, '').length;
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        const sentences = (text.match(/(\.|\?|!)\s/g) || []).length + (text.endsWith('.') || text.endsWith('?') || text.endsWith('!') ? 1 : 0);
        const paragraphs = (text.match(/\n\s*\n/g) || []).length + (text.trim() === '' ? 0 : 1);

        const WPM = 200;
        const totalMinutes = words / WPM;
        const minutes = Math.floor(totalMinutes);
        const seconds = Math.round((totalMinutes - minutes) * 60);
        const readTime = `${minutes}m ${seconds}s`;

        return { words, charsNoSpaces, charsWithSpaces, sentences, paragraphs, readTime };
    }

    updateCitationPreview() {
        const style = document.querySelector('input[name="citationFormat"]:checked').value;
        const type = $('sourceType').value;
        const previewEl = $('citationPreview');

        this.renderCitationInputs(type);

        const data = {
            lastName: $('citeLastName')?.value || 'Author',
            year: $('citeYear')?.value || '2023',
            title: $('citeTitle')?.value || 'Example Title',
            publisher: $('citePublisher')?.value || 'AI Press',
            website: $('citeWebsite')?.value || 'example.com'
        };

        let citation = 'Add details to see the formatted citation here.';
        
        switch (style) {
            case 'APA':
                citation = this.generateAPA(type, data);
                break;
            case 'MLA':
                citation = this.generateMLA(type, data);
                break;
            case 'Chicago':
                citation = this.generateChicago(type, data);
                break;
        }

        previewEl.innerHTML = citation;
    }

    renderCitationInputs(type) {
        const container = $('citationInputs');
        if (!container) return;

        let html = '';
        if (type === 'Book') {
            html = `
                <div class="mb-3"><label class="form-label">Author Last Name</label><input type="text" id="citeLastName" class="form-control w-100"></div>
                <div class="mb-3"><label class="form-label">Publication Year</label><input type="number" id="citeYear" class="form-control w-100"></div>
                <div class="mb-3"><label class="form-label">Title</label><input type="text" id="citeTitle" class="form-control w-100"></div>
                <div class="mb-3"><label class="form-label">Publisher</label><input type="text" id="citePublisher" class="form-control w-100"></div>
            `;
        } else if (type === 'Website') {
             html = `
                <div class="mb-3"><label class="form-label">Author Last Name (Optional)</label><input type="text" id="citeLastName" class="form-control w-100"></div>
                <div class="mb-3"><label class="form-label">Website Name</label><input type="text" id="citeTitle" class="form-control w-100"></div>
                <div class="mb-3"><label class="form-label">URL</label><input type="text" id="citeWebsite" class="form-control w-100"></div>
                <div class="mb-3"><label class="form-label">Access Date</label><input type="text" id="citeYear" class="form-control w-100" placeholder="${new Date().toLocaleDateString()}"></div>
            `;
        }
        container.innerHTML = html || container.innerHTML; 
        
        container.querySelectorAll('input, select').forEach(input => {
            input.removeEventListener('input', this.updateCitationPreview.bind(this));
            input.addEventListener('input', this.updateCitationPreview.bind(this));
        });
    }

    copyCitation() {
        const citationText = $('citationPreview').textContent;
        navigator.clipboard.writeText(citationText).then(() => {
            alert('Citation copied!');
        }).catch(err => {
            console.error('Failed to copy citation:', err);
        });
    }

    generateAPA(type, data) {
        if (type === 'Book') {
            return `${data.lastName}, A. ( ${data.year} ). ${data.title}. ${data.publisher}.`;
        } else if (type === 'Website') {
            return `${data.lastName ? data.lastName + ', A. ' : 'Anon.'} (${data.year}). ${data.title}. Retrieved from ${data.website}`;
        }
        return 'APA format not available for this type.';
    }

    generateMLA(type, data) {
        if (type === 'Book') {
            return `${data.lastName}, John. ${data.title}. ${data.publisher}, ${data.year}.`;
        } else if (type === 'Website') {
            return `${data.lastName}, John. "${data.title}." ${data.website}, ${data.year}.`;
        }
        return 'MLA format not available for this type.';
    }

    generateChicago(type, data) {
        if (type === 'Book') {
            return `${data.lastName}, John. ${data.year}. ${data.title}. New York: ${data.publisher}.`;
        }
        return 'Chicago format not available for this type.';
    }
}

// Initialize manager
const kanojoManagerInstance = new kanojoConnect();

// Initialize Himitsu tools on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    kanojoManagerInstance.initHimitsuTools();
});

// build kanojo
kanojoManagerInstance.buildPrompt(kanojoManagerInstance.selectedKanojo);

class LoliConnectManager {
    constructor() {
        this.presets = {
            translator: `You are a professional translator. Translate the following text accurately while preserving tone and context.

Example:
Input: Hello, how are you?
Output: Bonjour, comment allez-vous?

Input: I love programming
Output: J'adore la programmation`,

            summarizer: `You are a concise summarizer. Provide a brief, clear summary of the given text.

Example:
Input: Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans. AI research has been defined as the field of study of intelligent agents, which refers to any system that perceives its environment and takes actions that maximize its chance of achieving its goals.
Output: AI is machine intelligence that perceives environments and acts to achieve goals, contrasting with natural animal intelligence.`,

            coder: `You are a helpful coding assistant. Explain code, fix bugs, or write clean implementations.

Example:
Input: Write a Python function to reverse a string
Output:
\`\`\`python
def reverse_string(s):
    return s[::-1]
\`\`\``,

            researcher: `You are a research assistant. Provide accurate, well-sourced information on topics.

Example:
Input: What is quantum computing?
Output: Quantum computing is a type of computation that harnesses quantum mechanical phenomena like superposition and entanglement to process information. Unlike classical computers that use bits (0 or 1), quantum computers use qubits which can exist in multiple states simultaneously.`
        };

        this.loadSavedState();
    }

    loadSavedState() {
        const saved = localStorage.getItem('loliConnectState');
        if (saved) {
            const state = JSON.parse(saved);
            const prepromptField = document.getElementById('loliConnectPreprompt');
            if (prepromptField && state.preprompt) {
                prepromptField.value = state.preprompt;
            }
        }
    }

    saveState() {
        const preprompt = document.getElementById('loliConnectPreprompt')?.value || '';
        localStorage.setItem('loliConnectState', JSON.stringify({ preprompt }));
    }

    loadPreset(presetName) {
        const prepromptField = document.getElementById('loliConnectPreprompt');
        if (prepromptField && presetName && this.presets[presetName]) {
            prepromptField.value = this.presets[presetName];
            this.saveState();
        }
    }

    async execute() {
        const preprompt = document.getElementById('loliConnectPreprompt')?.value || '';
        const input = document.getElementById('loliConnectInput')?.value || '';
        const outputField = document.getElementById('loliConnectOutput');
        
        if (!input.trim()) {
            alert('Please enter an input query');
            return;
        }

        if (outputField) {
            outputField.value = 'Processing...';
        }

        this.saveState();

        const fullPrompt = preprompt ? `${preprompt}\n\nInput: ${input}\nOutput:` : input;

        const streamEnabled = document.getElementById('streamToggle')?.checked || false;

        try {
            if (streamEnabled) {
                if (outputField) outputField.value = '';

                const response = await fetch('/message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: { text: fullPrompt, data: [], id: Date.now().toString() },
                        chat: null,
                        speech: false,
                        kanojo: false,
                        useHistory: false,
                        stream: true,
                        yunaConfig: null
                    })
                });

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const jsonStr = line.slice(6).trim();
                                if (jsonStr) {
                                    const data = JSON.parse(jsonStr);
                                    if (data.chunk && outputField) {
                                        outputField.value += data.chunk;
                                        outputField.scrollTop = outputField.scrollHeight;
                                    }
                                }
                            } catch (e) {
                                console.error('Error parsing SSE:', e);
                            }
                        }
                    }
                }
            } else {
                const response = await fetch('/message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: { text: fullPrompt, data: [], id: Date.now().toString() },
                        chat: null,
                        speech: false,
                        kanojo: false,
                        useHistory: false,
                        stream: false,
                        yunaConfig: null
                    })
                });

                const data = await response.json();
                if (outputField) {
                    outputField.value = data.response || '';
                }
            }
        } catch (err) {
            console.error('LoliConnect error:', err);
            if (outputField) {
                outputField.value = `Error: ${err.message}`;
            }
        }
    }
}

const loliConnectManager = new LoliConnectManager();
window.loliConnectManager = loliConnectManager;

const elements = {
    workArea: $('work-area'),
    outputArea: $('output-area'),
    sendButton: $('createButtonHimitsuCreator'),
    clearButton: $('clearButtonHimitsuCreator'),
};

function sendNaked() {
    const streamEnabled = document.getElementById('streamToggle')?.checked || false;

    if (streamEnabled) {
        // Handle streaming for naked mode with real-time typing
        if (elements.outputArea) {
            elements.outputArea.value = '';
        }

        fetch(`/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: { text: elements.workArea?.value || '', data: [], id: Date.now().toString() },
                chat: null, speech: false, kanojo: false, useHistory: false, stream: true, yunaConfig: null
            })
        })
        .then(async response => {
            if (!response.ok) throw new Error('Network response was not ok');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');

                // Keep the last incomplete line in the buffer
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonStr = line.slice(6).trim();
                            if (jsonStr) {
                                const data = JSON.parse(jsonStr);

                                if (data.chunk) {
                                    // Append each chunk to the existing text
                                    if (elements.outputArea) {
                                        elements.outputArea.value += data.chunk;
                                        elements.outputArea.scrollTop = elements.outputArea.scrollHeight;
                                    }
                                }

                                if (data.done) {
                                    // Save the final output
                                    if (elements.outputArea) {
                                        localStorage.setItem('outputAreaContent', elements.outputArea.value);
                                    }
                                    break;
                                }

                                if (data.error) {
                                    if (elements.outputArea) {
                                        elements.outputArea.value = 'Error: ' + data.error;
                                    }
                                    break;
                                }
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data:', e, 'Line:', line);
                        }
                    }
                }
            }
        })
        .catch(error => {
            console.error('Streaming error:', error);
            if (elements.outputArea) {
                elements.outputArea.value = 'Error: Failed to get response';
            }
        });
    } else {
        // Handle non-streaming (existing code)
        fetch(`/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: { text: elements.workArea?.value || '', data: [], id: Date.now().toString() },
                chat: null, speech: false, kanojo: false, useHistory: false, stream: false, yunaConfig: null
            })
        })
        .then(response => { if (!response.ok) throw new Error('Network response was not ok'); return response.json(); })
        .then(data => { if (elements.outputArea) elements.outputArea.value = data.response; })
        .catch(console.error);
    }
}

elements.sendButton?.addEventListener('click', sendNaked);

document.addEventListener('DOMContentLoaded', () => {
    const savedOutput = localStorage.getItem('outputAreaContent');
    if (savedOutput && elements.outputArea) elements.outputArea.value = savedOutput;
});

elements.clearButton?.addEventListener('click', () => {
    if (elements.workArea) elements.workArea.value = '';
    if (elements.outputArea) elements.outputArea.value = '';
    localStorage.removeItem('outputAreaContent');
});

elements.outputArea?.addEventListener('input', () => {
    if (elements.outputArea) localStorage.setItem('outputAreaContent', elements.outputArea.value);
});

window.kanojoManagerInstance = kanojoManagerInstance;

class YunaSearchManager {
    constructor() {
        this.apiKey = localStorage.getItem('kagiApiKey') || '';
        
        // Check URL parameters on load
        document.addEventListener('DOMContentLoaded', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const searchQuery = urlParams.get('search');
            
            if (searchQuery) {
                togglePanel('yunaSearch');
                const searchInput = document.getElementById('yunaSearchInput');
                if (searchInput) {
                    searchInput.value = decodeURIComponent(searchQuery);
                }
                this.search();
            }
            
            this.setupKeyListener();
            this.setupAutocomplete();
        });
    }

    setupKeyListener() {
        const searchInput = document.getElementById('yunaSearchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.clearSuggestions();
                    this.search();
                }
            });
        }
    }

    setupAutocomplete() {
        const searchInput = document.getElementById('yunaSearchInput');
        if (!searchInput) return;

        // Create suggestions container if it doesn't exist
        let suggestionsContainer = document.getElementById('yunaSearchSuggestions');
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'yunaSearchSuggestions';
            suggestionsContainer.className = 'yuna-search-suggestions';
            searchInput.parentElement.appendChild(suggestionsContainer);
        }

        // Debounced autocomplete
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            
            if (!query) {
                this.clearSuggestions();
                return;
            }

            debounceTimer = setTimeout(() => {
                this.fetchSuggestions(query);
            }, 300);
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#yunaSearchInput') && !e.target.closest('#yunaSearchSuggestions')) {
                this.clearSuggestions();
            }
        });
    }

    async fetchSuggestions(query) {
        try {
            // Use local proxy instead of direct Kagisuggest
            const response = await fetch(`/searchsuggest?q=${encodeURIComponent(query)}`);
            if (!response.ok) return;
            
            const data = await response.json();
            if (data && data[1] && data[1].length > 0) {
                this.renderSuggestions(data[1].slice(0, 7)); // Limit to 7 suggestions
            } else {
                this.clearSuggestions();
            }
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
            this.clearSuggestions();
        }
    }

    renderSuggestions(suggestions) {
        const container = document.getElementById('yunaSearchSuggestions');
        if (!container) return;

        container.innerHTML = suggestions.map(suggestion => 
            `<div class="suggestion-item" onclick="yunaSearchManager.selectSuggestion('${suggestion.replace(/'/g, "\\'")}')">${suggestion}</div>`
        ).join('');
        
        container.style.display = 'block';
    }

    clearSuggestions() {
        const container = document.getElementById('yunaSearchSuggestions');
        if (container) {
            container.innerHTML = '';
            container.style.display = 'none';
        }
    }

    selectSuggestion(suggestion) {
        const searchInput = document.getElementById('yunaSearchInput');
        if (searchInput) {
            searchInput.value = suggestion;
        }
        this.clearSuggestions();
        this.search();
    }

    async search() {
        const query = document.getElementById('yunaSearchInput')?.value?.trim();
        if (!query) return;

        const newUrl = `${window.location.pathname}?search=${encodeURIComponent(query)}`;
        window.history.pushState({}, '', newUrl);

        const resultsContainer = document.getElementById('yunaSearchResults');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Searching...</span></div></div>';

        try {
            if (!this.apiKey) {
                this.apiKey = prompt('Please enter your Kagi API key (will be saved locally):');
                if (!this.apiKey) {
                    resultsContainer.innerHTML = '<div class="alert alert-warning">API key required for search.</div>';
                    return;
                }
                localStorage.setItem('kagiApiKey', this.apiKey);
            }

            const response = await fetch(`/search?q=${encodeURIComponent(query)}&limit=20`, {
                method: 'GET',
                headers: {
                    'X-Kagi-Key': this.apiKey
                }
            });

            // Try to parse JSON safely
            let data;
            try {
                data = await response.json();
            } catch (e) {
                throw new Error('Invalid response from Kagi API');
            }

            if (!response.ok || data.error) {
                throw new Error(data.error || `Search failed: ${response.status}`);
            }

            this.renderResults(data.data, query);
            
            window.history.replaceState({}, '', window.location.pathname);
            
        } catch (err) {
            console.error('Search error:', err);
            resultsContainer.innerHTML = `<div class="alert alert-danger">Search failed: ${err.message}. <button class="btn btn-sm btn-link" onclick="localStorage.removeItem('kagiApiKey'); yunaSearchManager.search();">Reset API Key</button></div>`;
            window.history.replaceState({}, '', window.location.pathname);
        }
    }

    renderResults(results, query) {
        const resultsContainer = document.getElementById('yunaSearchResults');
        if (!results || results.length === 0) {
            resultsContainer.innerHTML = '<div class="text-muted text-center p-4">No results found.</div>';
            return;
        }

        let html = `<div class="search-results-grid">`;

        results.forEach(result => {
            if (result.t === 0) {
                // Search result
                html += `
                    <div class="search-result-card glassy-surface">
                        ${result.thumbnail ? `<img src="${result.thumbnail.url}" class="search-result-thumbnail" alt="thumbnail">` : ''}
                        <div class="search-result-content">
                            <a href="${result.url}" target="_blank" class="search-result-title">${result.title}</a>
                            <p class="search-result-snippet">${result.snippet || ''}</p>
                            <div class="search-result-meta">
                                <small class="text-muted">${new URL(result.url).hostname}</small>
                                ${result.published ? `<small class="text-muted ms-2">• ${new Date(result.published).toLocaleDateString()}</small>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            } else if (result.t === 1) {
                // Related searches
                html += `
                    <div class="related-searches-card glassy-surface">
                        <h6>Related Searches</h6>
                        <div class="related-searches-list">
                            ${result.list.map(term => 
                                `<button class="btn btn-sm btn-outline-primary related-search-btn" onclick="document.getElementById('yunaSearchInput').value='${term.replace(/'/g, "\\'")}'; yunaSearchManager.search();">${term}</button>`
                            ).join('')}
                        </div>
                    </div>
                `;
            }
        });

        html += `</div>`;
        resultsContainer.innerHTML = html;
    }
}

const yunaSearchManager = new YunaSearchManager();
window.yunaSearchManager = yunaSearchManager;