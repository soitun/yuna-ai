const HANASU_KEY = 'hanasuLibrary';

class HanasuManager {
    constructor() {
        this.library = this.loadLibrary();
        this.selectedBookId = null;
        this.currentBook = null;
        this.playbackIndex = 0;
        this.isPlaying = false;
        this.audioQueue = [];
        this.synthesizing = false;

        this.ttsAudioElement = new Audio();
        this.ttsAudioElement.onended = () => this.nextSentence();

        document.addEventListener('DOMContentLoaded', () => {
            this.renderLibrary();
            document.getElementById('newBookFileInput')?.addEventListener('change', (e) => this.handleFileUpload(e));
        });
    }

    loadLibrary() {
        try {
            const data = localStorage.getItem(HANASU_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error("Failed to load Hanasu Library:", e);
            return {};
        }
    }

    saveLibrary() {
        localStorage.setItem(HANASU_KEY, JSON.stringify(this.library));
        this.renderLibrary();
    }

    addNewBook() {
        const titleInput = $('newBookTitle');
        const contentInput = $('newBookContent');

        const title = titleInput.value.trim() || 'Untitled Article';
        const content = contentInput.value.trim();

        if (!content) {
            alert('Please paste or upload content for the new book.');
            return;
        }

        const id = 'book-' + Date.now();
        this.library[id] = {
            id,
            title,
            content,
            progress: 0,
            sentences: this.splitIntoSentences(content)
        };

        this.saveLibrary();

        titleInput.value = '';
        contentInput.value = '';
        $('newBookFileInput').value = '';

        alert(`Book "${title}" added to library.`);
    }

    handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            $('newBookContent').value = event.target.result;
            $('newBookTitle').value = file.name.replace(/\.txt$/i, '');
        };
        reader.readAsText(file);
    }

    deleteSelectedBook() {
        if (!this.selectedBookId) {
            alert('Please select a book to delete.');
            return;
        }
        if (!confirm(`Are you sure you want to delete "${this.library[this.selectedBookId].title}"?`)) {
            return;
        }

        delete this.library[this.selectedBookId];
        this.saveLibrary();
        this.selectedBookId = null;
        this.currentBook = null;
        this.updateReaderDisplay();
    }

    selectBook(bookId) {
        this.selectedBookId = bookId;
        this.renderLibrary();
    }

    renderLibrary() {
        const listEl = $('hanasuLibraryList');
        if (!listEl) return;

        listEl.innerHTML = Object.values(this.library).map(book => {
            const progress = (book.progress / book.sentences.length) * 100 || 0;
            const isSelected = book.id === this.selectedBookId ? 'selected' : '';

            return `
                <li class="library-list-item ${isSelected}" onclick="hanasuManager.selectBook('${book.id}')">
                    <span class="book-title" title="${book.title}">${book.title}</span>
                    <small class="text-muted ms-2">${Math.round(progress)}% read</small>
                </li>
            `;
        }).join('');
    }

    loadBookForReading() {
        if (!this.selectedBookId || !this.library[this.selectedBookId]) {
            alert('Please select a book from the library.');
            return;
        }
        this.currentBook = this.library[this.selectedBookId];
        this.playbackIndex = this.currentBook.progress;
        this.updateReaderDisplay();
    }

    splitIntoSentences(text) {
        const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
        return sentences.map(s => s.trim()).filter(s => s.length > 0);
    }

    updateReaderDisplay() {
        const readerEl = $('readerArea');
        const titleEl = $('readerTitle');
        const statusEl = $('readerStatus');

        if (!this.currentBook) {
            readerEl.innerHTML = '';
            titleEl.textContent = 'No Book Selected';
            statusEl.textContent = 'Select a book from the library to begin reading.';
            return;
        }

        titleEl.textContent = this.currentBook.title;
        statusEl.textContent = `Progress: ${this.currentBook.progress} / ${this.currentBook.sentences.length} sentences.`;

        const htmlContent = this.currentBook.sentences.map((sent, index) => {
            let classes = ['highlighted-sentence'];
            if (index < this.currentBook.progress) {
                classes.push('read');
            } else if (index === this.playbackIndex) {
                // Only add 'playing' class if currently playing
                if (this.isPlaying && this.ttsAudioElement.currentTime > 0 && !this.ttsAudioElement.paused || this.synthesizing) {
                    classes.push('playing');
                }
            }
            return `<span id="hanasu-sent-${index}" class="${classes.join(' ')}">${sent}</span>`;
        }).join(' ');

        readerEl.innerHTML = htmlContent;

        const currentSpan = $(`hanasu-sent-${this.playbackIndex}`);
        if (currentSpan) {
            currentSpan.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    async togglePlayback() {
        if (!this.currentBook) {
            alert('Please load a book first.');
            return;
        }

        if (this.isPlaying) {
            this.pausePlayback();
        } else {
            this.isPlaying = true;
            this.updatePlayPauseIcon(true);
            this.readNextFragment();
        }
    }

    pausePlayback() {
        this.isPlaying = false;
        this.ttsAudioElement.pause();
        this.updatePlayPauseIcon(false);
        this.updateReaderDisplay();
    }

    stopPlayback() {
        this.pausePlayback();
        this.playbackIndex = this.currentBook.progress;
        this.audioQueue = [];
        this.ttsAudioElement.src = '';
        this.updateReaderDisplay();
    }

    updatePlayPauseIcon(playing) {
        const playButton = $('hanasuPlayPause');
        const pathElement = playButton.querySelector('path');
        const playD = "M0.268555 5.91309C0.268555 6.31836 0.498047 6.51367 0.78125 6.51367C0.90332 6.51367 1.03516 6.47461 1.16211 6.40625L5.62012 3.81836C5.97656 3.6084 6.09375 3.47656 6.09375 3.25684C6.09375 3.03711 5.97656 2.90527 5.62012 2.69531L1.16211 0.107422C1.03516 0.0390625 0.90332 0 0.78125 0C0.498047 0 0.268555 0.195312 0.268555 0.600586ZM0.97168 5.58105L0.97168 0.932617C0.97168 0.878906 1.02539 0.849609 1.07422 0.874023L5.06836 3.20312C5.09766 3.21289 5.10742 3.2373 5.10742 3.25684C5.10742 3.27637 5.09766 3.2959 5.06836 3.31055L1.07422 5.63965C1.02539 5.66406 0.97168 5.63477 0.97168 5.58105Z";
        const pauseD = "M1.2 1.25H2.8V5.25H1.2V1.25ZM3.8 1.25H5.4V5.25H3.8V1.25Z"; // Simplified stop icon path for small SVG area

        if (pathElement) {
            // Since the SVG format is different, we manually inject only the path.
            pathElement.setAttribute('d', playing ? pauseD : playD);
            pathElement.setAttribute('viewBox', playing ? "0 0 6.6 6.5" : "0 0 6.09375 6.51855"); // Set a new viewBox for the pause D
        }
    }

    async readNextFragment() {
        if (!this.isPlaying) return;

        if (this.playbackIndex >= this.currentBook.sentences.length) {
            this.currentBook.progress = this.currentBook.sentences.length;
            this.saveLibrary();
            this.stopPlayback();
            alert('Finished reading the book!');
            return;
        }

        // Highlight the current sentence before speaking
        this.updateReaderDisplay();

        if (this.audioQueue.length === 0 && !this.synthesizing) {
            const textToGenerate = this.currentBook.sentences
                .slice(this.playbackIndex, this.playbackIndex + 5)
                .join(' ');

            if (textToGenerate.length > 0) {
                await this.generateAudio(textToGenerate, this.playbackIndex);
            }
        }

        if (this.audioQueue.length > 0) {
            const audioData = this.audioQueue.shift();
            // Crucial: Update playbackIndex here before playing
            this.playbackIndex = audioData.startIndex;

            this.ttsAudioElement.src = audioData.url;
            await this.ttsAudioElement.play();
        } else if (!this.synthesizing) {
            this.stopPlayback();
            console.error("Failed to generate audio for the next chunk. Stopping.");
        }
    }

    nextSentence() {
        // Mark current sentence as read, and advance the overall progress
        if (this.currentBook && this.playbackIndex < this.currentBook.sentences.length) {
            this.currentBook.progress = this.playbackIndex + 1;
            this.playbackIndex++;
            this.saveLibrary();
        }
        this.readNextFragment();
    }

    async generateAudio(text, startIndex) {
        if (this.synthesizing) return;
        this.synthesizing = true;
        $('readerStatus').textContent = 'Synthesizing audio...';

        // This is the mock implementation, returning a mock URL and adding it to the queue.
        // In a live system, this would be a proper fetch call returning the audio path.
        const mockAudioUrl = `/static/temp/hanasu-chunk-${startIndex}.mp3`;

        // Simulate a network delay
        await new Promise(r => setTimeout(r, 800));

        this.audioQueue.push({
            url: mockAudioUrl,
            startIndex: startIndex
        });

        $('readerStatus').textContent = 'Audio ready. Playing...';
        this.synthesizing = false;
    }

    generateSelection() {
        const selection = window.getSelection();
        let text;
        let startIndex = this.playbackIndex;

        if (selection.rangeCount > 0) {
            text = selection.toString().trim();
            // Note: Accurate startIndex tracking for arbitrary selection is complex;
            // for simplicity, we treat selection as a temporary chunk.
        } else {
            if (!this.currentBook) {
                alert('Load a book first.');
                return;
            }
            text = this.currentBook.sentences[this.playbackIndex];
        }

        if (text) {
            this.pausePlayback();
            this.audioQueue = [];

            this.generateAudio(text, startIndex);
            this.isPlaying = true;
            this.updatePlayPauseIcon(true);

            // Override end callback to stop immediately after playing the unique selection.
            this.ttsAudioElement.onended = () => {
                this.stopPlayback();
                this.ttsAudioElement.onended = () => this.nextSentence(); // Restore sequencing
            };
        }
    }

}

const hanasuManager = new HanasuManager();
window.hanasuManager = hanasuManager;

document.addEventListener('DOMContentLoaded', () => {
    hanasuManager.renderLibrary();
});