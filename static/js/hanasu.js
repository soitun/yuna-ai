const HANASU_KEY = 'hanasuLibrary';

class HanasuManager {
    constructor() {
        this.library = this.loadLibrary();
        this.selectedBookId = null;
        this.currentBook = null;
        this.playbackIndex = 0;
        this.nextGenIndex = 0;
        this.isPlaying = false;
        this.audioQueue = [];
        this.synthesizing = false;
        this.playbackSpeed = 1.0;
        this.volume = 1.0;

        this.ttsAudioElement = new Audio();
        this.ttsAudioElement.onended = () => this.handleAudioEnded();

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

    toggleAddBookMode() {
        const form = document.getElementById('addBookForm');
        if (form) {
            form.classList.toggle('hidden');
            if (!form.classList.contains('hidden')) {
                document.getElementById('newBookTitle')?.focus();
            }
        }
    }

    addNewBook() {
        const titleInput = document.getElementById('newBookTitle');
        const contentInput = document.getElementById('newBookContent');

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
        document.getElementById('newBookFileInput').value = '';
        this.toggleAddBookMode(); // Hide form

        // Auto select the new book
        this.selectBook(id);
    }

    handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('newBookContent').value = event.target.result;
            document.getElementById('newBookTitle').value = file.name.replace(/\.txt$/i, '');
        };
        reader.readAsText(file);
    }

    deleteSelectedBook() {
        if (!this.selectedBookId) return;

        if (confirm('Are you sure you want to delete this book?')) {
            delete this.library[this.selectedBookId];
            this.saveLibrary();
            this.selectedBookId = null;
            this.currentBook = null;
            this.showLibrary(); // Go back to library view
        }
    }

    selectBook(bookId) {
        this.selectedBookId = bookId;
        this.renderLibrary();
        this.loadBookForReading();
        this.showReader();
    }

    showLibrary() {
        document.getElementById('hanasuLibraryView').classList.add('active');
        document.getElementById('hanasuReaderView').classList.remove('active');
        this.stopPlayback();
    }

    showReader() {
        document.getElementById('hanasuLibraryView').classList.remove('active');
        document.getElementById('hanasuReaderView').classList.add('active');
    }

    renderLibrary() {
        const listEl = document.getElementById('hanasuLibraryList');
        if (!listEl) return;

        const books = Object.values(this.library);

        listEl.innerHTML = books.map(book => {
            const progress = book.sentences.length > 0 ? (book.progress / book.sentences.length) * 100 : 0;
            const isSelected = book.id === this.selectedBookId ? 'selected' : '';

            return `
                <li class="library-list-item ${isSelected}" onclick="hanasuManager.selectBook('${book.id}')">
                    <span class="book-title" title="${book.title}">${book.title}</span>
                    <small class="text-muted" style="font-size: 0.8em;">${Math.round(progress)}% complete</small>
                </li>
            `;
        }).join('');
    }

    loadBookForReading() {
        if (!this.selectedBookId || !this.library[this.selectedBookId]) {
            return;
        }
        this.currentBook = this.library[this.selectedBookId];
        this.playbackIndex = this.currentBook.progress || 0;
        this.nextGenIndex = this.playbackIndex;
        this.updateReaderDisplay();
        this.updateControlsUI();
    }

    splitIntoSentences(text) {
        // Improved sentence splitting
        return text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
    }

    updateReaderDisplay() {
        const readerEl = document.getElementById('readerArea');
        const titleEl = document.getElementById('readerTitle');

        if (!this.currentBook) {
            readerEl.innerHTML = '';
            titleEl.textContent = 'Book Title';
            return;
        }

        titleEl.textContent = this.currentBook.title;

        // Only re-render if necessary
        if (readerEl.childElementCount !== this.currentBook.sentences.length) {
            const htmlContent = this.currentBook.sentences.map((sent, index) => {
                return `<span id="hanasu-sent-${index}" class="highlighted-sentence" onclick="hanasuManager.jumpTo(${index})">${sent}</span>`;
            }).join(' ');
            readerEl.innerHTML = htmlContent;
        }

        // Update classes
        const spans = readerEl.querySelectorAll('.highlighted-sentence');
        spans.forEach((span, index) => {
            span.className = 'highlighted-sentence'; // Reset
            if (index < this.playbackIndex) {
                span.classList.add('read');
            } else if (index === this.playbackIndex) {
                span.classList.add('playing');
            }
        });

        const currentSpan = document.getElementById(`hanasu-sent-${this.playbackIndex}`);
        if (currentSpan) {
            currentSpan.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }

        this.updateControlsUI();
    }

    toggleEditMode() {
        const readerArea = document.getElementById('readerArea');
        const editor = document.getElementById('readerEditor');
        const controls = document.getElementById('editorControls');
        const titleEl = document.getElementById('readerTitle');

        if (!this.currentBook) return;

        if (readerArea.classList.contains('hidden')) {
            // Cancel Edit
            readerArea.classList.remove('hidden');
            editor.classList.add('hidden');
            controls.classList.add('hidden');
            titleEl.contentEditable = "false";
            titleEl.classList.remove('glassy-input'); // Remove visual cue
        } else {
            // Start Edit
            this.stopPlayback();
            readerArea.classList.add('hidden');
            editor.classList.remove('hidden');
            controls.classList.remove('hidden');

            editor.value = this.currentBook.content;

            // Allow title editing
            titleEl.contentEditable = "true";
            titleEl.classList.add('glassy-input'); // Add visual cue
            titleEl.focus();
        }
    }

    saveBookEdits() {
        if (!this.currentBook) return;

        const editor = document.getElementById('readerEditor');
        const titleEl = document.getElementById('readerTitle');

        const newContent = editor.value.trim();
        const newTitle = titleEl.textContent.trim();

        if (!newContent) {
            alert("Content cannot be empty.");
            return;
        }

        this.currentBook.content = newContent;
        this.currentBook.title = newTitle || "Untitled";
        this.currentBook.sentences = this.splitIntoSentences(newContent);
        this.currentBook.progress = 0; // Reset progress on content change? Or try to keep? Let's reset for safety.
        this.playbackIndex = 0;

        this.saveLibrary();
        this.toggleEditMode(); // Exit edit mode
        this.loadBookForReading(); // Reload view
    }

    updateControlsUI() {
        if (!this.currentBook) return;

        const total = this.currentBook.sentences.length;
        const current = this.playbackIndex; // 0-indexed

        const currentProgressEl = document.getElementById('hanasuCurrentProgress');
        const totalProgressEl = document.getElementById('hanasuTotalProgress');
        const progressEl = document.getElementById('hanasuProgress');

        const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

        if (currentProgressEl) currentProgressEl.textContent = `${percentage}%`;
        if (totalProgressEl) totalProgressEl.textContent = `100%`;

        if (progressEl) {
            progressEl.value = percentage;
        }
    }

    async togglePlayback() {
        if (!this.currentBook) return;

        if (this.isPlaying) {
            this.pausePlayback();
        } else {
            this.isPlaying = true;
            this.updatePlayPauseIcon(true);
            this.processQueue();
        }
    }

    pausePlayback() {
        this.isPlaying = false;
        this.ttsAudioElement.pause();
        this.updatePlayPauseIcon(false);
    }

    stopPlayback() {
        this.pausePlayback();
        this.audioQueue = [];
        this.ttsAudioElement.src = '';
        this.nextGenIndex = this.playbackIndex;
    }

    setSpeed(speed) {
        this.playbackSpeed = parseFloat(speed);
        this.ttsAudioElement.playbackRate = this.playbackSpeed;
    }

    setVolume(volume) {
        this.volume = parseFloat(volume);
        this.ttsAudioElement.volume = this.volume;
    }

    seek(percentage) {
        if (!this.currentBook) return;
        const total = this.currentBook.sentences.length;
        const index = Math.floor((percentage / 100) * total);
        this.jumpTo(Math.min(index, total - 1));
    }

    jumpTo(index) {
        if (!this.currentBook) return;
        this.playbackIndex = index;
        this.nextGenIndex = index;
        this.currentBook.progress = this.playbackIndex;
        this.saveLibrary();

        this.updateReaderDisplay();

        if (this.isPlaying) {
            this.stopPlayback(); // Clear queue
            this.isPlaying = true;
            this.updatePlayPauseIcon(true);
            this.processQueue();
        }
    }

    prevSentence() {
        if (this.playbackIndex > 0) {
            this.jumpTo(this.playbackIndex - 1);
        }
    }

    nextSentence() {
        if (this.currentBook && this.playbackIndex < this.currentBook.sentences.length - 1) {
            this.jumpTo(this.playbackIndex + 1);
        }
    }

    async processQueue() {
        if (!this.isPlaying) return;

        if (this.audioQueue.length > 0) {
            const audioData = this.audioQueue.shift();
            this.playbackIndex = audioData.startIndex;
            this.updateReaderDisplay();

            this.ttsAudioElement.src = audioData.url;
            this.ttsAudioElement.playbackRate = this.playbackSpeed;
            this.ttsAudioElement.volume = this.volume;

            try {
                // Ensure context is running if needed (though this is an Audio element)
                await this.ttsAudioElement.play();
            } catch (e) {
                console.error("Playback failed", e);
                this.handleAudioEnded(); // Skip if fail
            }
        } else {
            if (!this.synthesizing) {
                await this.generateNextBatch();
            }
        }
    }

    handleAudioEnded() {
        if (this.isPlaying) {
            this.processQueue();
        }
    }

    async generateNextBatch() {
        if (this.synthesizing || !this.currentBook) return;

        if (this.nextGenIndex >= this.currentBook.sentences.length) {
            this.stopPlayback();
            return;
        }

        this.synthesizing = true;
        const index = this.nextGenIndex;
        const text = this.currentBook.sentences[index];

        try {
            const formData = new FormData();
            formData.append('task', 'tts');
            formData.append('text', text);

            const response = await fetch('/audio', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('TTS failed');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            this.audioQueue.push({ url, startIndex: index });
            this.nextGenIndex++;

            // If we were waiting (queue was empty), process immediately
            if (this.isPlaying && this.audioQueue.length === 1 && this.ttsAudioElement.paused) {
                this.processQueue();
            }

        } catch (e) {
            console.error("TTS Error", e);
        } finally {
            this.synthesizing = false;
        }
    }

    updatePlayPauseIcon(playing) {
        const playButton = document.getElementById('hanasuPlayPause');
        if (!playButton) return;

        const pathElement = playButton.querySelector('path');
        // Simple SVG path swap or innerHTML swap
        if (playing) {
            playButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5"/></svg>`;
        } else {
            playButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/></svg>`;
        }
    }
}

const hanasuManager = new HanasuManager();
window.hanasuManager = hanasuManager;