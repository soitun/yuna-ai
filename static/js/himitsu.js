class kanojoConnect {
    constructor() {
        this.loadData();

        // Initialize on DOM ready
        document.addEventListener('DOMContentLoaded', () => {
            this.initFields();
        });
    }

    async loadData() {
        try {
            const response = await fetch('/user_data?type=profile');
            const data = await response.json();

            if (data && !data.error) {
                this.memory = data.memory || '';
                this.shujinko = data.shujinko || '';
                this.aibo = data.aibo || '';

                // Update fields if they exist
                const memoryField = document.getElementById('kanojoMemory');
                const shujinkoField = document.getElementById('kanojoShujinko');
                const aiboField = document.getElementById('kanojoAibo');

                if (memoryField) memoryField.value = this.memory;
                if (shujinkoField) shujinkoField.value = this.shujinko;
                if (aiboField) aiboField.value = this.aibo;
            }
        } catch (e) {
            console.error('Failed to load profile data:', e);
        }
    }

    async saveData() {
        const data = {
            memory: this.memory,
            shujinko: this.shujinko,
            aibo: this.aibo
        };

        try {
            await fetch('/user_data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'profile', content: data })
            });
        } catch (e) {
            console.error('Failed to save profile data:', e);
        }
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
            showNotification('Citation copied!', 'success');
        }).catch(err => {
            console.error('Failed to copy citation:', err);
            showNotification('Failed to copy citation', 'error');
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
        this.presets = {};
        this.activePreset = null;
        this.loadSavedState();
    }

    async loadSavedState() {
        try {
            const response = await fetch('/user_data?type=loliconnect');
            const data = await response.json();

            if (data && !data.error) {
                this.presets = data.presets || {};
                this.activePreset = data.active || null;

                // If empty, init with defaults
                if (Object.keys(this.presets).length === 0) {
                    this.initDefaults();
                }

                this.renderPresets();
                this.loadActivePreset();
            } else {
                this.initDefaults();
                this.renderPresets();
            }
        } catch (e) {
            console.error('Failed to load LoliConnect state:', e);
            this.initDefaults();
        }
    }

    initDefaults() {
        this.presets = {
            'General': ''
        };
        this.activePreset = 'General';
        this.saveState();
    }

    async saveState() {
        // Update current active preset value before saving
        if (this.activePreset && this.presets[this.activePreset] !== undefined) {
            const currentVal = document.getElementById('loliConnectPreprompt')?.value;
            if (currentVal !== undefined) this.presets[this.activePreset] = currentVal;
        }

        try {
            await fetch('/user_data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'loliconnect',
                    content: {
                        presets: this.presets,
                        active: this.activePreset
                    }
                })
            });
            showNotification('LoliConnect saved!', 'success');
        } catch (e) {
            console.error('Failed to save LoliConnect state:', e);
            showNotification('Failed to save LoliConnect', 'error');
        }
    }

    renderPresets() {
        const select = document.getElementById('loliConnectPresetSelect');
        if (!select) return;

        select.innerHTML = Object.keys(this.presets).map(name =>
            `<option value="${name}" ${name === this.activePreset ? 'selected' : ''}>${name}</option>`
        ).join('');

        select.onchange = (e) => this.switchPreset(e.target.value);
    }

    switchPreset(name) {
        // Save current before switching
        if (this.activePreset) {
            const currentVal = document.getElementById('loliConnectPreprompt')?.value;
            if (currentVal !== undefined) this.presets[this.activePreset] = currentVal;
        }

        this.activePreset = name;
        this.loadActivePreset();
        // Don't auto-save to disk on switch, only on explicit save or edit?
        // User said "autosave", so let's save.
        this.saveState();
    }

    loadActivePreset() {
        const prepromptField = document.getElementById('loliConnectPreprompt');
        if (prepromptField && this.activePreset && this.presets[this.activePreset]) {
            prepromptField.value = this.presets[this.activePreset];
        }
    }

    addPreset() {
        showInputModal('New Loli Preset', 'Enter a name for the new preset:', (name) => {
            if (this.presets[name]) {
                showNotification('Preset already exists', 'error');
                return;
            }
            this.presets[name] = '';
            this.activePreset = name;
            this.renderPresets();
            this.loadActivePreset();
            this.saveState();
            showNotification(`Preset "${name}" created`, 'success');
        });
    }

    renamePreset() {
        if (!this.activePreset) return;
        showInputModal('Rename Preset', `Enter new name for "${this.activePreset}":`, (newName) => {
            if (this.presets[newName]) {
                showNotification('Name already taken', 'error');
                return;
            }
            const content = this.presets[this.activePreset];
            delete this.presets[this.activePreset];
            this.presets[newName] = content;
            this.activePreset = newName;
            this.renderPresets();
            this.saveState();
            showNotification('Preset renamed', 'success');
        }, this.activePreset);
    }

    deletePreset() {
        if (!this.activePreset) return;
        if (Object.keys(this.presets).length <= 1) {
            showNotification('Cannot delete the last preset', 'error');
            return;
        }

        // No confirmation window as requested, but maybe a notification?
        // "don't add any confirmation windows"
        const name = this.activePreset;
        delete this.presets[name];
        this.activePreset = Object.keys(this.presets)[0];
        this.renderPresets();
        this.loadActivePreset();
        this.saveState();
        showNotification(`Preset "${name}" deleted`, 'info');
    }

    async execute() {
        const preprompt = document.getElementById('loliConnectPreprompt')?.value || '';
        const input = document.getElementById('loliConnectInput')?.value || '';
        const outputField = document.getElementById('loliConnectOutput');

        if (!input.trim()) {
            showNotification('Please enter an input query', 'error');
            return;
        }

        if (outputField) {
            outputField.value = 'Processing...';
        }

        // Update current preset value in memory
        if (this.activePreset) {
            this.presets[this.activePreset] = preprompt;
        }

        // Auto-save
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
})