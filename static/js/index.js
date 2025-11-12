var messageIdCounter = 0;
var currentAttachments = [];

// Apply the glassy-surface class to static elements
['floatingMenu', 'kanojoPanel', 'historyPanel', 'himitsuPanel', 'hanasuReaderPanel'].forEach(id => {
    document.getElementById(id)?.classList.add('glassy-surface');
});
document.querySelector('.input-area .input-group')?.classList.add('glassy-surface');
document.querySelectorAll('.diary-card').forEach(el => el.classList.add('glassy-surface'));
document.getElementById('readerArea')?.classList.add('glassy-surface'); // Add to reader area

// Panel Management
const togglePanel = (panelName) => {
    const id = `${panelName}Panel`;
    document.querySelectorAll('.popup-panel').forEach(p => {
        p.id === id ? p.classList.toggle('active') : p.classList.remove('active');
    });
    const overlay = document.getElementById('overlay');
    const currentPanel = document.getElementById(id);
    overlay && overlay.classList.toggle('active', currentPanel?.classList.contains('active'));
};

const closeAllPanels = () => {
    document.querySelectorAll('.popup-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('overlay')?.classList.remove('active');
};

// Top Menu
const toggleFloatingMenu = () => document.getElementById('floatingMenu')?.classList.toggle('visible');

// Attachments
const handleFileAttachment = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = 'image/*,video/*,audio/*,text/*,.txt,.py,.js,.html,.css,.json,.xml,.md,.csv,.log,.conf,.ini,.yaml,.yml,.sh,.bat,.sql,.php,.cpp,.c,.h,.java,.cs,.rb,.go,.rs,.swift,.kt,.ts,.vue,.jsx,.tsx';
    fileInput.onchange = (e) => {
        // Clear previous attachments if new files are selected
        currentAttachments = Array.from(e.target.files || []);
        updateAttachmentIndicator();
    };
    fileInput.click();
};

const updateAttachmentIndicator = () => {
    const attachButton = document.querySelector('.attach-button');
    const messageInput = document.getElementById('messageInput');
    if (!attachButton || !messageInput) return;
    if (currentAttachments.length > 0) {
        // Use SVG for the icon and show count
        attachButton.classList.add('has-attachments');
        attachButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" class="bi bi-paperclip" viewBox="0 0 16 16">
                <path d="M4.5 3.5a1 1 0 0 1 1 1v7a2 2 0 1 0 4 0V5.071c0-1.24-1.03-2.245-2.296-2.004l3.18 3.18a3.5 3.5 0 0 1-5.918 3.654L4.5 10.071V4.5a1 1 0 0 1 1-1z"/>
            </svg>
            ${currentAttachments.length}`;
        messageInput.placeholder = `Message Yuna... (${currentAttachments.length} files attached)`;
    } else {
        attachButton.classList.remove('has-attachments');
        attachButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" class="bi bi-paperclip" viewBox="0 0 16 16">
                <path d="M4.5 3.5a1 1 0 0 1 1 1v7a2 2 0 1 0 4 0V5.071c0-1.24-1.03-2.245-2.296-2.004l3.18 3.18a3.5 3.5 0 0 1-5.918 3.654L4.5 10.071V4.5a1 1 0 0 1 1-1z"/>
            </svg>`;
        messageInput.placeholder = 'Message Yuna...';
    }
};

const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

const fileToText = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });

// Message Manager
class messageManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    generateUniqueId() {
        return `msg-${Date.now()}-${messageIdCounter++}`;
    }

    renderMessage(message) {
        if (!message.id) message.id = this.generateUniqueId();

        const msgDiv = document.createElement('div');
        msgDiv.id = message.id;
        msgDiv.className = `message message-${message.name === 'Yuna' ? 'ai' : 'user'}`;

        // Add the text content first if it exists
        if (message.text && message.text.trim()) {
            const textDiv = document.createElement('div');
            textDiv.className = 'message-text';
            textDiv.textContent = message.text;
            msgDiv.appendChild(textDiv);
        }

        // Create action buttons based on message type
        const actionButtons = document.createElement('div');
        actionButtons.className = 'message-actions';

        const isAI = message.name === 'Yuna';
        const isUser = !isAI;

        // Common buttons for both AI and User messages
        const copyBtn = this.createActionButton('bi-clipboard', 'Copy', () => this.copyMessage(message.id));
        const editBtn = this.createActionButton('bi-pencil', 'Edit', () => this.editMessage(message.id));
        const deleteBtn = this.createActionButton('bi-trash', 'Delete', () => this.deleteMessage(message.id));
        const deleteAllBelowBtn = this.createActionButton('bi-trash3', 'Delete all below', () => this.deleteAllBelow(message.id));

        if (isUser) {
            // User message buttons: edit, delete, copy, delete all below
            actionButtons.appendChild(editBtn);
            actionButtons.appendChild(deleteBtn);
            actionButtons.appendChild(copyBtn);
            actionButtons.appendChild(deleteAllBelowBtn);
        } else {
            // AI message buttons: regenerate, edit, delete, copy, delete all below
            const regenerateBtn = this.createActionButton('bi-arrow-clockwise', 'Regenerate', () => this.regenerateMessage(message.id));
            actionButtons.appendChild(regenerateBtn);
            actionButtons.appendChild(editBtn);
            actionButtons.appendChild(deleteBtn);
            actionButtons.appendChild(copyBtn);
            actionButtons.appendChild(deleteAllBelowBtn);
        }

        const createMediaElement = (tag, src, type) => {
            const media = document.createElement(tag);
            media.src = src;
            media.classList.add('message-media');
            if (type === 'video') media.controls = true;
            media.addEventListener('click', () => openMediaModal(src, type));
            return media;
        };

        const createTextFileElement = (path, name, content) => {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'message-text-file';
            fileDiv.innerHTML = `
                <div class="text-file-header">
                    <i class="bi-file-earmark-text"></i>
                    <span class="text-file-name">${name}</span>
                </div>
                <div class="text-file-preview">${content.substring(0, 100)}${content.length > 100 ? '...' : ''}</div>
            `;
            fileDiv.addEventListener('click', () => openTextFileModal(name, content));
            return fileDiv;
        };

        if (message.data && Array.isArray(message.data)) {
            message.data.forEach(attachment => {
                if (attachment.type === 'image') {
                    const imageSrc = attachment.path || attachment.src;
                    if (imageSrc) {
                        msgDiv.appendChild(createMediaElement('img', imageSrc, 'image'));
                    }
                }
                else if (attachment.type === 'video') {
                    const videoSrc = attachment.path || attachment.src;
                    if (videoSrc) {
                        msgDiv.appendChild(createMediaElement('video', videoSrc, 'video'));
                    }
                }
                else if (attachment.type === 'audio') {
                    const audioSrc = attachment.path || attachment.src;
                    if (audioSrc) {
                        msgDiv.appendChild(createMediaElement('audio', audioSrc, 'audio'));
                    }
                }
                else if (attachment.type === 'text') {
                    const textFilePath = attachment.path || '#';
                    const textFileName = attachment.name || 'text_file.txt';
                    const textContent = attachment.content || '';
                    msgDiv.appendChild(createTextFileElement(textFilePath, textFileName, textContent));
                }
                else if (attachment.type === 'yunafile') {
                    const fileLink = document.createElement('a');
                    fileLink.href = attachment.path || '#';
                    fileLink.textContent = attachment.description || 'Download file';
                    fileLink.className = 'message-file-link';
                    fileLink.target = '_blank';
                    msgDiv.appendChild(fileLink);
                }
            });
        }

        msgDiv.appendChild(actionButtons);
        this.container.appendChild(msgDiv);
        this.container.scrollTop = this.container.scrollHeight;
        return message.id;
    }

    createActionButton(icon, title, onClick) {
        const button = document.createElement('button');
        button.className = 'action-btn';
        button.innerHTML = icon;
        button.title = title;
        button.onclick = (e) => {
            e.stopPropagation();
            onClick();
        };
        return button;
    }

    copyMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (!messageElement) return;

        const textDiv = messageElement.querySelector('.message-text');
        const text = textDiv ? textDiv.textContent : '';

        navigator.clipboard.writeText(text).then(() => {
            // Show brief feedback
            const originalTitle = messageElement.title;
            messageElement.title = 'Copied!';
            setTimeout(() => {
                messageElement.title = originalTitle;
            }, 1000);
        }).catch(err => {
            console.error('Failed to copy text:', err);
        });
    }

    editMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (!messageElement) return;

        const textDiv = messageElement.querySelector('.message-text');
        if (!textDiv) return;

        const originalText = textDiv.textContent;

        // Create textarea for editing
        const textarea = document.createElement('textarea');
        textarea.className = 'edit-textarea';
        textarea.value = originalText;
        textarea.style.width = '100%';
        textarea.style.minHeight = '60px';
        textarea.style.resize = 'vertical';

        // Create save/cancel buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'edit-buttons';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-sm btn-primary me-2';
        saveBtn.textContent = 'Save';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-sm btn-secondary';
        cancelBtn.textContent = 'Cancel';

        buttonContainer.appendChild(saveBtn);
        buttonContainer.appendChild(cancelBtn);

        // Replace text with edit interface
        textDiv.style.display = 'none';
        textDiv.after(textarea);
        textarea.after(buttonContainer);
        textarea.focus();

        const cleanup = () => {
            textarea.remove();
            buttonContainer.remove();
            textDiv.style.display = 'block';
        };

        saveBtn.onclick = async () => {
            const newText = textarea.value.trim();
            if (newText !== originalText) {
                try {
                    const response = await fetch('/history', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            task: 'edit_message',
                            chat: chatHistoryManagerInstance?.selectedFilename,
                            message_id: messageId,
                            new_text: newText
                        })
                    });

                    const data = await response.json();
                    if (data.response === 'Message edited successfully') {
                        textDiv.textContent = newText;
                    } else {
                        console.error('Failed to edit message:', data);
                        alert('Failed to edit message');
                    }
                } catch (err) {
                    console.error('Error editing message:', err);
                    alert('Error editing message');
                }
            }
            cleanup();
        };

        cancelBtn.onclick = cleanup;

        // Save on Enter (with Ctrl/Cmd), cancel on Escape
        textarea.onkeydown = (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                saveBtn.click();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelBtn.click();
            }
        };
    }

    async deleteMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (!messageElement) return;

        if (!confirm('Are you sure you want to delete this message?')) return;

        try {
            const response = await fetch('/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task: 'delete_message',
                    chat: chatHistoryManagerInstance?.selectedFilename,
                    message_id: messageId
                })
            });

            const data = await response.json();
            if (data.response === 'Message deleted successfully') {
                messageElement.remove();
            } else {
                console.error('Failed to delete message:', data);
                alert('Failed to delete message');
            }
        } catch (err) {
            console.error('Error deleting message:', err);
            alert('Error deleting message');
        }
    }

    async deleteAllBelow(messageId) {
        const messageElement = document.getElementById(messageId);
        if (!messageElement) return;

        if (!confirm('Are you sure you want to delete all messages below this one?')) return;

        // Get all messages below this one
        const messagesToDelete = [];
        let nextElement = messageElement.nextElementSibling;
        while (nextElement && nextElement.classList.contains('message')) {
            messagesToDelete.push(nextElement.id);
            nextElement = nextElement.nextElementSibling;
        }

        if (messagesToDelete.length === 0) return;

        try {
            const response = await fetch('/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task: 'delete_all_below',
                    chat: chatHistoryManagerInstance?.selectedFilename,
                    message_id: messageId
                })
            });

            const data = await response.json();
            if (data.response === 'Messages deleted successfully') {
                // Remove elements from UI
                messagesToDelete.forEach(id => {
                    const element = document.getElementById(id);
                    if (element) element.remove();
                });
            } else {
                console.error('Failed to delete messages:', data);
                alert('Failed to delete messages');
            }
        } catch (err) {
            console.error('Error deleting messages:', err);
            alert('Error deleting messages');
        }
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const text = (input?.value || '').trim();
        if (!text && currentAttachments.length === 0) return;

        // Prepare attachments for the backend
        const attachmentData = await Promise.all(
            currentAttachments.map(async (file) => {
                const isTextFile = file.type.startsWith('text/') ||
                    /\.(txt|py|js|html|css|json|xml|md|csv|log|conf|ini|yaml|yml|sh|bat|sql|php|cpp|c|h|java|cs|rb|go|rs|swift|kt|ts|vue|jsx|tsx)$/i.test(file.name);

                if (isTextFile) {
                    return {
                        name: file.name,
                        type: 'text',
                        content: await fileToText(file)
                    };
                } else {
                    return {
                        name: file.name,
                        type: file.type,
                        content: await fileToBase64(file)
                    };
                }
            })
        );

        // The user's message object with all data
        const userMsg = {
            name: 'User',
            type: 'text',
            text: text,
            data: attachmentData,
            id: this.generateUniqueId()
        };

        // Render the user message
        this.renderMessage(userMsg);

        // Render attachments visually if they exist
        currentAttachments.forEach(file => {
            const isTextFile = file.type.startsWith('text/') ||
                /\.(txt|py|js|html|css|json|xml|md|csv|log|conf|ini|yaml|yml|sh|bat|sql|php|cpp|c|h|java|cs|rb|go|rs|swift|kt|ts|vue|jsx|tsx)$/i.test(file.name);

            if (isTextFile) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const attachmentMsg = {
                        name: 'User',
                        type: 'text',
                        data: [{
                            type: 'text',
                            name: file.name,
                            content: e.target.result,
                            render: true
                        }],
                        id: this.generateUniqueId()
                    };
                    this.renderMessage(attachmentMsg);
                };
                reader.readAsText(file);
            } else {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const attachmentMsg = {
                        name: 'User',
                        type: file.type.startsWith('image/') ? 'image' : 'yunafile',
                        data: [{
                            type: file.type.startsWith('image/') ? 'image' : 'yunafile',
                            src: e.target.result,
                            description: file.name,
                            render: true
                        }],
                        id: this.generateUniqueId()
                    };
                    this.renderMessage(attachmentMsg);
                };
                reader.readAsDataURL(file);
            }
        });

        // Clear input and attachments after preparing them
        if (input) {
            input.value = '';
            // Reset height after sending
            input.style.height = 'auto';
            input.style.height = `${input.scrollHeight}px`;
        }
        currentAttachments = [];
        updateAttachmentIndicator();

        // Check if streaming is enabled
        const streamEnabled = document.getElementById('streamToggle')?.checked || false;

        if (streamEnabled) {
            // Handle streaming response with real-time typing effect
            const aiMessageId = this.generateUniqueId();
            const aiMessageDiv = document.createElement('div');
            aiMessageDiv.id = aiMessageId;
            aiMessageDiv.className = 'message message-ai';

            const textDiv = document.createElement('div');
            textDiv.className = 'message-text';
            textDiv.textContent = ''; // Start empty
            aiMessageDiv.appendChild(textDiv);

            this.container.appendChild(aiMessageDiv);
            this.container.scrollTop = this.container.scrollHeight;

            try {
                const response = await fetch('/message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: userMsg,
                        chat: chatHistoryManagerInstance?.selectedFilename,
                        useHistory: document.getElementById('useHistory')?.checked,
                        kanojo: kanojoManagerInstance?.buildPrompt(),
                        speech: false,
                        yunaConfig: typeof config_data !== 'undefined' ? config_data : undefined,
                        stream: true
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

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
                                        // Append the new chunk to existing text
                                        textDiv.textContent += data.chunk;
                                        this.container.scrollTop = this.container.scrollHeight;
                                    }

                                    if (data.done) {
                                        // Update the message ID to match the one from history
                                        if (data.ai_message_id) {
                                            aiMessageDiv.id = data.ai_message_id;
                                        }

                                        // Add action buttons
                                        const actionButtons = document.createElement('div');
                                        actionButtons.className = 'message-actions';

                                        const regenerateBtn = this.createActionButton(`bi-arrow-clockwise`, 'Regenerate', () => this.regenerateMessage(aiMessageDiv.id));
                                        const editBtn = this.createActionButton('bi-pencil', 'Edit', () => this.editMessage(aiMessageDiv.id));
                                        const deleteBtn = this.createActionButton('bi-trash', 'Delete', () => this.deleteMessage(aiMessageDiv.id));
                                        const copyBtn = this.createActionButton('bi-clipboard', 'Copy', () => this.copyMessage(aiMessageDiv.id));
                                        const deleteAllBelowBtn = this.createActionButton('bi-trash3', 'Delete all below', () => this.deleteAllBelow(aiMessageDiv.id));

                                        actionButtons.appendChild(regenerateBtn);
                                        actionButtons.appendChild(editBtn);
                                        actionButtons.appendChild(deleteBtn);
                                        actionButtons.appendChild(copyBtn);
                                        actionButtons.appendChild(deleteAllBelowBtn);

                                        aiMessageDiv.appendChild(actionButtons);
                                        break;
                                    }

                                    if (data.error) {
                                        textDiv.textContent = 'Error: ' + data.error;
                                        break;
                                    }
                                }
                            } catch (e) {
                                console.error('Error parsing SSE data:', e, 'Line:', line);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Streaming error:', err);
                const textDiv = aiMessageDiv.querySelector('.message-text');
                if (textDiv) {
                    textDiv.textContent = 'Error: Failed to get response';
                }
            }
        } else {
            // Handle non-streaming response (existing code)
            fetch('/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    chat: chatHistoryManagerInstance?.selectedFilename,
                    useHistory: document.getElementById('useHistory')?.checked,
                    kanojo: kanojoManagerInstance?.buildPrompt(),
                    speech: false,
                    yunaConfig: typeof config_data !== 'undefined' ? config_data : undefined,
                    stream: false
                })
            })
            .then(r => r.json())
            .then(data => this.renderMessage({
                name: 'Yuna',
                type: 'text',
                text: data.response,
                data: null,
                id: data.ai_message_id // ensure DOM id matches history id
            }))
            .catch(err => console.error('Error:', err));
        }
    }

    async regenerateMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (!messageElement) return;

        if (!confirm('This will delete this response and all messages below it, then regenerate. Continue?')) return;

        // Collect all elements from this AI message downwards to remove from UI later
        let elementToRemove = messageElement;
        const elementsToRemove = [];
        while (elementToRemove) {
            elementsToRemove.push(elementToRemove);
            elementToRemove = elementToRemove.nextElementSibling;
            if (elementToRemove && !elementToRemove.classList.contains('message')) break;
        }

        try {
            // The message object sent is now just a placeholder.
            // The key is the 'messageId' of the AI response to regenerate from.
            // The backend will handle history pruning and find the original user prompt.
            const response = await fetch('/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: { id: messageId }, // Pass the AI message ID
                    chat: chatHistoryManagerInstance?.selectedFilename,
                    useHistory: document.getElementById('useHistory')?.checked,
                    kanojo: kanojoManagerInstance?.buildPrompt(),
                    speech: false,
                    yunaConfig: typeof config_data !== 'undefined' ? config_data : undefined,
                    stream: false,
                    regenerate: true
                })
            });

            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            const data = await response.json();

            // On success, first remove the old messages from the UI
            elementsToRemove.forEach(el => el.remove());

            // Then render the new message
            this.renderMessage({
                name: 'Yuna',
                type: 'text',
                text: data.response,
                data: null,
                id: data.ai_message_id // use history's new AI id
            });

        } catch (err) {
            console.error('Error during regeneration:', err);
            alert('An error occurred during regeneration. Please check the console.');
        }
    }
}

const messageManagerInstance = new messageManager('chatContainer');

// Attach-button listener (idempotent binding in case this script loads at different times)
const bindAttachButton = () => {
    const btn = document.querySelector('.attach-button');
    if (btn && !btn.dataset.bound) {
        btn.addEventListener('click', handleFileAttachment);
        btn.dataset.bound = '1';
    }
};
bindAttachButton();
document.addEventListener('DOMContentLoaded', bindAttachButton);

// Text File Modal (Remains the same, using new modal HTML)
const openTextFileModal = (name, content) => {
    const modal = document.getElementById('textFileModal');
    if (!modal) return;

    const modalTitle = modal.querySelector('.modal-title');
    const contentDiv = modal.querySelector('.text-file-content');

    modalTitle.textContent = name;
    // Highlight syntax if possible, otherwise use <pre><code>
    contentDiv.innerHTML = `<pre><code>${content.split('<').join('&lt;').split('>').join('&gt;')}</code></pre>`;

    new bootstrap.Modal(modal).show();
};

class CallManager {
    constructor() {
        this.isAudioRecording = false;
        this.isVideoRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.audioChunks = [];
        this.stream = null;
        this.pendingAudioUrl = null;
        this.callModal = null;

        this.isTTSMode = true;
        this.selectedMicId = null;
        this.currentFacingMode = 'user';
        this.isPhotoPending = false;
        this.pendingPhotoBlob = null;
    }

    init() {
        this.callModal = document.getElementById('callModal');

        // --- Call Modal Controls ---
        document.getElementById('recordButton')?.addEventListener('click', () => this.toggleAudioRecording());
        document.getElementById('userVideoFrame')?.addEventListener('click', (e) => this.switchCamera(e));
        document.getElementById('photoCaptureButton')?.addEventListener('click', () => this.capturePhoto());
        document.getElementById('videoRecordButton')?.addEventListener('click', () => this.toggleVideoRecording());
        document.getElementById('audioToggleButton')?.addEventListener('click', () => this.toggleMic());
        document.getElementById('videoToggleButton')?.addEventListener('click', () => this.toggleVideo());

        // --- Settings ---
        document.getElementById('ttsToggle')?.addEventListener('change', (e) => this.isTTSMode = e.target.checked);
        document.getElementById('micSelect')?.addEventListener('change', (e) => {
            this.selectedMicId = e.target.value;
            localStorage.setItem('selectedMicId', this.selectedMicId);
            if (this.stream) {
                this.startCall(true);
            }
        });

        this.populateMicrophones();

        // Make the user video bubble draggable!
        const userVideoFrame = document.getElementById('userVideoFrame');
        if (userVideoFrame) makeDraggable(userVideoFrame);
    }

    async populateMicrophones() {
        try {
            const genericStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            genericStream.getTracks().forEach(track => track.stop());

            const devices = await navigator.mediaDevices.enumerateDevices();
            const mics = devices.filter(device => device.kind === 'audioinput');
            const micSelect = document.getElementById('micSelect');
            if (!micSelect) return;

            micSelect.innerHTML = mics.map(mic => `<option value="${mic.deviceId}">${mic.label || `Microphone ${micSelect.options.length + 1}`}</option>`).join('');

            this.selectedMicId = localStorage.getItem('selectedMicId') || (mics.length > 0 ? mics[0].deviceId : null);
            if (this.selectedMicId) {
                micSelect.value = this.selectedMicId;
            }
        } catch (err) {
            console.warn('Could not enumerate devices or failed to get initial audio permission:', err);
            this.updateStatus('Microphone access denied or unavailable.');
        }
    }

    async startCall(isRestart = false) {
        if (!isRestart) {
            // Simple modal show - add 'show' class and display block
            if (this.callModal) {
                this.callModal.classList.add('show');
                this.callModal.style.display = 'block';
                document.body.classList.add('modal-open');
                
                // Add backdrop
                let backdrop = document.querySelector('.modal-backdrop');
                if (!backdrop) {
                    backdrop = document.createElement('div');
                    backdrop.className = 'modal-backdrop fade show';
                    document.body.appendChild(backdrop);
                }
            }
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        try {
            const constraints = {
                audio: { deviceId: this.selectedMicId ? { exact: this.selectedMicId } : undefined },
                video: { facingMode: this.currentFacingMode }
            };
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);

            const localVideo = document.getElementById('localVideo');
            if(localVideo) {
                localVideo.srcObject = this.stream;
                localVideo.classList.toggle('flip-horizontal', this.currentFacingMode === 'user');
            }

            this.stream.getAudioTracks().forEach(track => this.updateControlState('audioToggleButton', track.enabled));
            this.stream.getVideoTracks().forEach(track => this.updateControlState('videoToggleButton', track.enabled));

            this.updateStatus('Click the microphone to speak');

        } catch (err) {
            console.error('Error accessing media devices:', err);
            this.updateStatus('Could not access camera/microphone.');
            alert('Camera/Microphone permission is required. Please grant permission and try again.');
        }
    }

    updateControlState(buttonId, isEnabled) {
        const button = document.getElementById(buttonId) || document.getElementById(`floating${buttonId.substring(0, buttonId.length - 6)}`);
        if (button) {
            button.classList.toggle('active', isEnabled);
        }
    }

    toggleMic() {
        if (!this.stream) return;
        const audioTrack = this.stream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            this.updateControlState('audioToggleButton', audioTrack.enabled);
        }
    }

    toggleVideo() {
        if (!this.stream) return;
        const videoTrack = this.stream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            this.updateControlState('videoToggleButton', videoTrack.enabled);
        }
    }

    switchCamera(e = null) {
        if (e) e.stopPropagation();
        this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
        this.startCall(true);
    }

    endCall() {
        if (this.isAudioRecording) this.toggleAudioRecording();
        if (this.isVideoRecording) this.toggleVideoRecording();
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        // Simple modal hide
        if (this.callModal) {
            this.callModal.classList.remove('show');
            this.callModal.style.display = 'none';
            document.body.classList.remove('modal-open');
            
            // Remove backdrop
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.remove();
        }
        
        this.closeFloatingVideo();
        this.updateStatus('Call ended.');
        document.getElementById('recordButton')?.classList.remove('recording');
    }

    setupMediaRecorder(isAudioOnly = true) {
        if (!this.stream) return;
        const tracks = isAudioOnly ? this.stream.getAudioTracks() : this.stream.getTracks();
        const mediaStream = new MediaStream(tracks);

        try {
            const mimeType = isAudioOnly ? 'audio/webm;codecs=opus' : 'video/webm;codecs=vp8,opus';
            const options = { mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : (isAudioOnly ? 'audio/webm' : 'video/webm') };

            this.mediaRecorder = new MediaRecorder(mediaStream, options);
            this.recordedChunks = [];
            this.mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) this.recordedChunks.push(event.data);
            };

            this.mediaRecorder.onstop = () => {
                const recordedBlob = new Blob(this.recordedChunks, { type: this.mediaRecorder.mimeType });
                this.recordedChunks = [];

                if (isAudioOnly) {
                    this.sendAudioToServer(recordedBlob);
                } else {
                    const fileExtension = recordedBlob.type.includes('video') ? 'webm' : recordedBlob.type.split('/')[1];
                    const videoFile = new File([recordedBlob], `video_message.${fileExtension}`, { type: recordedBlob.type });
                    currentAttachments.push(videoFile);
                    messageManagerInstance.sendMessage("Video attachment sent.");
                }
            };
        } catch (err) {
            console.error("Error setting up MediaRecorder:", err);
            this.updateStatus("Couldn't start recorder.");
        }
    }

    toggleAudioRecording() {
        this.isAudioRecording = !this.isAudioRecording;

        if (this.isAudioRecording && this.isVideoRecording) {
            this.toggleVideoRecording();
        }

        if (this.isAudioRecording) {
            this.setupMediaRecorder(true);
            this.mediaRecorder.start();
            this.updateStatus('Listening...');
        } else {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
            }
            this.updateStatus('Processing...');
        }
        document.getElementById('recordButton')?.classList.toggle('recording', this.isAudioRecording);
        document.getElementById('floatingAudioRecord')?.classList.toggle('recording', this.isAudioRecording);
    }

    toggleVideoRecording() {
        this.isVideoRecording = !this.isVideoRecording;

        if (this.isVideoRecording && this.isAudioRecording) {
            this.toggleAudioRecording();
        }

        if (this.isVideoRecording) {
            this.setupMediaRecorder(false);
            this.mediaRecorder.start();
            this.updateStatus('Recording video...');
        } else {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
            }
            this.updateStatus('Processing video...');
        }

        document.getElementById('videoRecordButton')?.classList.toggle('recording', this.isVideoRecording);
        document.getElementById('floatingVideoRecord')?.classList.toggle('recording', this.isVideoRecording);
    }

    capturePhoto() {
        const localVideo = document.getElementById('localVideo');
        if (!localVideo || !this.stream?.getVideoTracks()[0]?.enabled) {
            this.updateStatus('Camera is off!');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = localVideo.videoWidth;
        canvas.height = localVideo.videoHeight;
        const ctx = canvas.getContext('2d');

        if (this.currentFacingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(localVideo, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(blob => {
            const photoFile = new File([blob], "selfie.jpg", { type: "image/jpeg" });
            currentAttachments.push(photoFile);
            messageManagerInstance.sendMessage("Image captured and sent.");

            this.updateStatus('Photo sent!');
            setTimeout(() => this.updateStatus('Click the microphone to speak'), 1500);

        }, 'image/jpeg');
    }

    async sendAudioToServer(audioBlob) {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'user_recording.wav');
        formData.append('chat_id', chatHistoryManagerInstance.selectedFilename);
        formData.append('kanojo', kanojoManagerInstance.buildPrompt(kanojoManagerInstance.selectedKanojo));
        formData.append('useHistory', document.getElementById('useHistory')?.checked);

        const config = typeof config_data !== 'undefined' ? config_data : {};

        try {
            const response = await fetch('/call', { method: 'POST', body: formData });
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            const tempTTSState = this.isTTSMode;
            this.isTTSMode = false;

            const userMsgId = messageManagerInstance.renderMessage({ name: config.ai.names[0], type: 'text', text: data.user_text });
            const aiMsgId = messageManagerInstance.renderMessage({ name: config.ai.names[1], type: 'text', text: data.yuna_text });

            this.pendingAudioUrl = data.audio_url;
            this.updateStatus(`Yuna: ${data.yuna_text.substring(0, 50)}...`, true)
            this.playPendingAudio();

            setTimeout(() => {
                this.isTTSMode = tempTTSState;
            }, 500);

        } catch (err) {
            console.error('Error during call:', err);
            this.updateStatus('Sorry, an error occurred.', false);
        }
    }

    playPendingAudio() {
        if (this.pendingAudioUrl) {
            this.updateStatus('Playing Yuna\'s response...', false);
            const audio = new Audio(this.pendingAudioUrl);
            audio.play();
            audio.onended = () => this.updateStatus('Click the microphone to speak', false);
        } else {
             this.updateStatus('Click the microphone to speak', false);
        }
        this.pendingAudioUrl = null;
    }

    updateStatus(text, isPlayable = false) {
        const statusEl = document.getElementById('callStatus');
        if (statusEl) {
            statusEl.textContent = text;
            statusEl.classList.toggle('playable', isPlayable && !this.isTTSMode);
            if (isPlayable && !this.isTTSMode) {
                 statusEl.onclick = () => this.playPendingAudio();
            } else {
                 statusEl.onclick = null;
            }
        }
    }

    switchToFloatingVideo() {
        let videoWindow = document.getElementById('floatingVideoWindow');
        if (!videoWindow) {
            videoWindow = document.createElement('div');
            videoWindow.className = 'floating-video-window';
            videoWindow.id = 'floatingVideoWindow';
            videoWindow.innerHTML = `
                <video id="floatingVideo" muted autoplay></video>
                <div class="floating-controls">
                    <button id="floatingPhotoCapture" class="control-button" aria-label="Capture Photo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16"><path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0"/><path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1m9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0"/></svg>
                    </button>
                    <button id="floatingVideoRecord" class="control-button" aria-label="Record Video">
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2z"/><circle cx="5.5" cy="8" r="1.5" fill="red"/></svg>
                    </button>
                    <button id="floatingAudioRecord" class="control-button record-button" aria-label="Start Recording">
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16"><path d="M5 3a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0z"/><path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5"/></svg>
                    </button>
                    <button class="control-button end-call-button" onclick="callManagerInstance.endCall()" aria-label="End Call">
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.885.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.68.68 0 0 0 .178.643l2.457 2.457a.68.68 0 0 0 .644.178l2.189-.547a1.75 1.75 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.6 18.6 0 0 1-7.01-4.42 18.6 18.6 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877z"/><path fill-rule="evenodd" d="M11.146 1.646a.5.5 0 0 1 .708 0L14 3.793l2.146-2.147a.5.5 0 0 1 .708.708L14.707 4.5l2.147 2.146a.5.5 0 0 1-.708.708L14 5.207l-2.146 2.147a.5.5 0 0 1-.708-.708L13.293 4.5l-2.147-2.146a.5.5 0 0 1 0-.708"/></svg>
                    </button>
                </div>
            `;
            document.body.appendChild(videoWindow);
            makeDraggable(videoWindow);

            document.getElementById('floatingPhotoCapture').addEventListener('click', () => this.capturePhoto());
            document.getElementById('floatingVideoRecord').addEventListener('click', () => this.toggleVideoRecording());
            document.getElementById('floatingAudioRecord').addEventListener('click', () => this.toggleAudioRecording());
        }

        const floatingVideo = document.getElementById('floatingVideo');
        if (floatingVideo && this.stream) {
            floatingVideo.srcObject = new MediaStream(this.stream.getVideoTracks());
            floatingVideo.classList.toggle('flip-horizontal', this.currentFacingMode === 'user');
        }

        videoWindow.classList.add('active');
        
        // Hide main modal
        if (this.callModal) {
            this.callModal.classList.remove('show');
            this.callModal.style.display = 'none';
            document.body.classList.remove('modal-open');
            
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.remove();
        }
    }

    closeFloatingVideo() {
        const videoWindow = document.getElementById('floatingVideoWindow');
        if (videoWindow) videoWindow.classList.remove('active');
    }
}

const callManagerInstance = new CallManager();

const showCallModal = () => callManagerInstance.startCall();
const endCall = () => callManagerInstance.endCall();
const switchToFloatingVideo = () => callManagerInstance.switchToFloatingVideo();
const closeFloatingVideo = () => callManagerInstance.closeFloatingVideo();

// Simple modal helper
const SimpleModal = {
    show: (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            modal.style.display = 'block';
            document.body.classList.add('modal-open');
            
            let backdrop = document.querySelector('.modal-backdrop');
            if (!backdrop) {
                backdrop = document.createElement('div');
                backdrop.className = 'modal-backdrop fade show';
                document.body.appendChild(backdrop);
            }
        }
    },
    hide: (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.remove();
        }
    },
    getOrCreate: (modalId) => ({
        show: () => SimpleModal.show(modalId),
        hide: () => SimpleModal.hide(modalId)
    })
};

// This function shows the modal instead of a prompt
function createNewChat() {
    const modalEl = document.getElementById('createChatModal');
    if (!modalEl) return;

    if (typeof closeAllPanels === 'function') {
        closeAllPanels();
    }

    const chatModal = SimpleModal.getOrCreate('createChatModal');
    const inputEl = document.getElementById('newChatNameInput');

    if(inputEl) {
        inputEl.value = 'new_chat.json';
        inputEl.focus();
    }

    chatModal.show();
}

// Advanced Config (Remains the same)
const saveAdvancedConfig = () => {
    // Collect all data from the Advanced Config panel fields
    const config = {};
    const inputs = document.querySelectorAll('#advancedCollapse .form-control, #advancedCollapse .form-check-input');
    inputs.forEach(input => {
        let key = input.id;
        let value;
        if (input.type === 'checkbox') {
            value = input.checked;
        } else if (input.type === 'number') {
            value = parseFloat(input.value) || parseInt(input.value);
        } else {
            value = input.value;
        }
        config[key] = value;
    });

    // Dummy fetch for demonstration; in a real app, this would update the backend config
    console.log('Saving advanced config:', config);
    alert('Advanced Config saved locally (simulated)');
};

// File Modal Submit (Remains the same)
document.getElementById('fileSubmit')?.addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput?.files?.[0];
    if (!file) return alert('No file selected.');

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const kanojoData = JSON.parse(reader.result);
            if (window.kanojoManagerInstance) {
                // Merge imported kanojos with existing ones
                Object.assign(window.kanojoManagerInstance.kanojos, kanojoData);
                window.kanojoManagerInstance.saveKanojos();

                // Refresh the panel using the method defined in himitsu.js
                if (typeof window.populateKanojoSelect === 'function') {
                    window.populateKanojoSelect();
                } else {
                    alert('Import successful! Please reopen the Kanojo panel to see changes. (JS dependency missing)');
                }
            }
             bootstrap.Modal.getInstance(document.getElementById('fileModal'))?.hide();
        } catch (err) {
            console.error('Error importing kanojo:', err);
            alert('Failed to import file. Make sure it is a valid JSON.');
        }
    };
    reader.readAsText(file);
});

// Media Modal (Uses new structure)
const openMediaModal = (src, type) => {
    const modal = document.getElementById('mediaModal');
    if (!modal) return;

    const contentDiv = modal.querySelector('.media-content');

    const element = document.createElement(type === 'image' ? 'img' : 'video');
    element.src = src;
    element.className = 'modal-media';
    element.style.maxWidth = '100%';
    element.style.maxHeight = '90vh';
    element.style.display = 'block';
    element.style.margin = 'auto';
    element.style.borderRadius = '15px';

    if (type === 'video') element.controls = true;

    contentDiv.replaceChildren(element);
    new bootstrap.Modal(modal).show();
};

// Draggable (Remains the same)
const makeDraggable = (el) => {
    if (!el) return;
    let pos = { x: 0, y: 0 };
    const dragMouseDown = (e) => {
        // Only start drag if not clicking buttons/inputs inside the frame
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
            e.preventDefault();
            pos = { x: e.clientX, y: e.clientY };
            document.addEventListener('mouseup', closeDragElement);
            document.addEventListener('mousemove', elementDrag);
            el.style.cursor = 'grabbing';
        }
    };
    const elementDrag = (e) => {
        e.preventDefault();
        el.style.top = `${el.offsetTop + (e.clientY - pos.y)}px`;
        el.style.left = `${el.offsetLeft + (e.clientX - pos.x)}px`;
        pos = { x: e.clientX, y: e.clientY };
    };
    const closeDragElement = () => {
        document.removeEventListener('mouseup', closeDragElement);
        document.removeEventListener('mousemove', elementDrag);
        el.style.cursor = 'grab';
    };
    el.addEventListener('mousedown', dragMouseDown);
};

// Intersection Observer for performance (remains the same)
const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
        m.addedNodes.forEach(n => {
            if (n.id === 'floatingVideoWindow' && n.nodeType === 1) {
                makeDraggable(n);
                // Rebind floating controls
                document.getElementById('floatingPhotoCapture')?.addEventListener('click', () => callManagerInstance.capturePhoto());
                document.getElementById('floatingVideoRecord')?.addEventListener('click', () => callManagerInstance.toggleVideoRecording());
                document.getElementById('floatingAudioRecord')?.addEventListener('click', () => callManagerInstance.toggleAudioRecording());
            }
        });
    });
});
observer.observe(document.body, { childList: true, subtree: true });

// Initialize draggables on load
const initializeDraggables = () => {
    document.querySelectorAll('.floating-video-window').forEach(makeDraggable);
};

// This ensures all HTML is loaded before we try to find elements
document.addEventListener('DOMContentLoaded', () => {
    callManagerInstance.init();
    bindAttachButton();
    initializeDraggables();

    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('input', () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = `${messageInput.scrollHeight}px`;
        });
    }

    // ADD THIS: Fix accordion functionality
    document.querySelectorAll('[data-bs-toggle="collapse"]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = button.getAttribute('data-bs-target');
            const target = document.querySelector(targetId);
            
            if (target) {
                const isExpanded = target.classList.contains('show');
                
                // Close all other accordions in the same parent
                const parent = target.closest('.accordion');
                if (parent) {
                    parent.querySelectorAll('.accordion-collapse.show').forEach(collapse => {
                        if (collapse !== target) {
                            collapse.classList.remove('show');
                            const collapseButton = document.querySelector(`[data-bs-target="#${collapse.id}"]`);
                            if (collapseButton) {
                                collapseButton.classList.add('collapsed');
                            }
                        }
                    });
                }
                
                // Toggle current accordion
                target.classList.toggle('show');
                button.classList.toggle('collapsed');
            }
        });
    });
});

// Expose needed functions to window (optional, but good for debugging/framework)
try {
    Object.assign(window, {
        togglePanel,
        closeAllPanels,
        showCallModal,
        endCall,
        toggleFloatingMenu,
        handleFileAttachment,
        updateAttachmentIndicator,
        fileToBase64,
        fileToText,
        openMediaModal,
        openTextFileModal,
        makeDraggable,
        switchToFloatingVideo,
        closeFloatingVideo,
        saveAdvancedConfig,
        messageManagerInstance,
        callManagerInstance,
    });
} catch (e) {}