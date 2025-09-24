var messageIdCounter = 0;
var currentAttachments = [];

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
        attachButton.classList.add('has-attachments');
        attachButton.innerHTML = `<i class="bi-paperclip"></i> ${currentAttachments.length}`;
        messageInput.placeholder = `Message Yuna... (${currentAttachments.length} files attached)`;
    } else {
        attachButton.classList.remove('has-attachments');
        attachButton.innerHTML = `<i class="bi-paperclip"></i>`;
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

    createActionButton(iconClass, title, onClick) {
        const button = document.createElement('button');
        button.className = 'action-btn';
        button.innerHTML = `<i class="${iconClass}"></i>`;
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
        if (input) input.value = '';
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
                        kanojo: kanojoManagerInstance?.buildPrompt(kanojoManagerInstance?.selectedKanojo),
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
                                        
                                        const regenerateBtn = this.createActionButton('bi-arrow-clockwise', 'Regenerate', () => this.regenerateMessage(aiMessageDiv.id));
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
                    kanojo: kanojoManagerInstance?.buildPrompt(kanojoManagerInstance?.selectedKanojo),
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
                    kanojo: kanojoManagerInstance?.buildPrompt(kanojoManagerInstance?.selectedKanojo),
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

// Text File Modal
const openTextFileModal = (name, content) => {
    let modal = document.getElementById('textFileModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'textFileModal';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">File Content</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="text-file-content"></div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }

    const modalTitle = modal.querySelector('.modal-title');
    const contentDiv = modal.querySelector('.text-file-content');
    
    modalTitle.textContent = name;
    contentDiv.innerHTML = `<pre><code>${content}</code></pre>`;

    new bootstrap.Modal(modal).show();
};

class CallManager {
    constructor() {
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
        this.pendingAudioUrl = null;
        this.recordButton = null;
        this.recordButtonFloating = null;
        this.callStatus = null;
        this.callModal = null;
    }

    init() {
        this.recordButton = document.getElementById('recordButton');
        this.callStatus = document.getElementById('callStatus');
        this.callModal = new bootstrap.Modal(document.getElementById('callModal'));
        if (this.recordButton) this.recordButton.addEventListener('click', () => this.toggleRecording());
        if (this.callStatus) this.callStatus.addEventListener('click', () => this.playPendingAudio());
    }

    async startCall() {
        this.callModal.show();
        if (!this.stream) {
            try {
                this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.setupMediaRecorder();
                this.updateStatus('Click the microphone to speak');
            } catch (err) {
                console.error('Error accessing microphone:', err);
                this.updateStatus('Could not access microphone. Please grant permission.');
                alert('Microphone permission is required for the call feature.');
            }
        }
    }

    endCall() {
        if (this.isRecording) this.mediaRecorder.stop();
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.callModal.hide();
        this.endAudioCall();
        this.updateStatus('Call ended.');
    }

    setupMediaRecorder() {
        if (!this.stream) return;
        this.mediaRecorder = new MediaRecorder(this.stream);
        this.mediaRecorder.ondataavailable = event => this.audioChunks.push(event.data);
        this.mediaRecorder.onstop = () => {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
            this.sendAudioToServer(audioBlob);
            this.audioChunks = [];
        };
    }

    toggleRecording() {
        if (!this.mediaRecorder) {
            alert('Call is not ready. Please wait or reload.');
            return;
        }
        this.isRecording = !this.isRecording;
        if (this.isRecording) {
            this.audioChunks = [];
            this.mediaRecorder.start();
            this.updateRecordButtons(true);
            this.updateStatus('Listening...');
        } else {
            this.mediaRecorder.stop();
            this.updateRecordButtons(false);
            this.updateStatus('Processing...');
        }
    }

    updateRecordButtons(isRecording) {
        [this.recordButton, this.recordButtonFloating].forEach(btn => {
            if (btn) {
                if (isRecording) btn.classList.add('recording');
                else btn.classList.remove('recording');
            }
        });
    }

    async sendAudioToServer(audioBlob) {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'user_recording.wav');
        formData.append('chat_id', chatHistoryManagerInstance.selectedFilename);
        formData.append('kanojo', kanojoManagerInstance.buildPrompt(kanojoManagerInstance.selectedKanojo));
        formData.append('useHistory', document.getElementById('useHistory')?.checked);
        try {
            const response = await fetch('/call', { method: 'POST', body: formData });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            messageManagerInstance.renderMessage({ name: 'User', type: 'text', text: data.user_text });
            messageManagerInstance.renderMessage({ name: 'Yuna', type: 'text', text: data.yuna_text });
            this.pendingAudioUrl = data.audio_url;
            this.updateStatus(`Yuna: "${data.yuna_text}" (Click to hear)`, true)
            setTimeout(() => this.playPendingAudio(), 1000);
        } catch (err) {
            console.error('Error during call:', err);
            this.updateStatus('Sorry, an error occurred.', false);
        }
    }

    playPendingAudio() {
        if (this.pendingAudioUrl) {
            this.updateStatus('Playing...', false);
            const audio = new Audio(this.pendingAudioUrl);
            audio.play();
            this.pendingAudioUrl = null;
            audio.onended = () => this.updateStatus('Click the microphone to speak', false);
        }
    }

    updateStatus(text, isPlayable = false) {
        if (this.callStatus) {
            this.callStatus.textContent = text;
            if (isPlayable) this.callStatus.classList.add('playable');
            else this.callStatus.classList.remove('playable');
        }
    }

    switchToAudio() {
        let audioWindow = document.getElementById('audioWindow');
        if (!audioWindow) {
            audioWindow = document.createElement('div');
            audioWindow.className = 'floating-audio-window';
            audioWindow.id = 'audioWindow';
            audioWindow.innerHTML = `
                <div class="controls-bar">
                    <button id="recordButtonFloating" class="control-button record-button" aria-label="Start Recording">
                        <i class="bi bi-mic-fill"></i>
                    </button>
                    <button class="control-button" aria-label="End Call" onclick="callManagerInstance.endCall()">
                        <i class="bi-telephone-x"></i>
                    </button>
                </div>`;
            document.body.appendChild(audioWindow);
            this.recordButtonFloating = document.getElementById('recordButtonFloating');
            if (this.recordButtonFloating) this.recordButtonFloating.addEventListener('click', () => this.toggleRecording());
            makeDraggable(audioWindow);
        }
        audioWindow.classList.add('active');
        this.callModal.hide();
    };

    endAudioCall() {
        const audioWindow = document.getElementById('audioWindow');
        if (audioWindow) audioWindow.classList.remove('active');
    }
}

const callManagerInstance = new CallManager();

const showCallModal = () => callManagerInstance.startCall();
const endCall = () => callManagerInstance.endCall();
const switchToAudio = () => callManagerInstance.switchToAudio();
const endAudioCall = () => callManagerInstance.endAudioCall();

// Advanced Config
const saveAdvancedConfig = () => {
    const config = {
        maxNewTokens: document.getElementById('maxNewTokens')?.value,
        contextLength: document.getElementById('contextLength')?.value,
        temperature: document.getElementById('temperature')?.value,
        topP: document.getElementById('topP')?.value
    };
    fetch('/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    })
    .then(r => r.json())
    .then(data => alert(data.message))
    .catch(err => console.error('Error:', err));
};

// File Modal Submit
document.getElementById('fileSubmit')?.addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput?.files?.[0];
    if (!file) return alert('No file selected.');

    const reader = new FileReader();
    reader.onload = () => {
        const kanojoData = JSON.parse(reader.result);
        fetch('/import-kanojo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(kanojoData)
        })
        .then(r => r.json())
        .then(data => {
            alert(data.message);
            if (fileInput) fileInput.value = '';
        })
        .catch(err => console.error('Error:', err));
    };
    reader.readAsText(file);
});

// Media Modal
const openMediaModal = (src, type) => {
    let modal = document.getElementById('mediaModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mediaModal';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered modal-xl">
                <div class="modal-content">
                    <div class="modal-body">
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        <div class="media-content"></div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }

    const element = document.createElement(type === 'image' ? 'img' : 'video');
    element.src = src;
    element.className = 'modal-media';
    if (type === 'video') element.controls = true;

    modal.querySelector('.media-content')?.replaceChildren(element);
    new bootstrap.Modal(modal).show();
};

// Draggable
const makeDraggable = (el) => {
    if (!el) return;
    let pos = { x: 0, y: 0 };
    const dragMouseDown = (e) => {
        e.preventDefault();
        pos = { x: e.clientX, y: e.clientY };
        document.addEventListener('mouseup', closeDragElement);
        document.addEventListener('mousemove', elementDrag);
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
    };
    el.addEventListener('mousedown', dragMouseDown);
};

document.body.addEventListener('click', (e) => {
    if (e.target.closest('.floating-audio-window .bi-telephone-x')) endAudioCall();
});

// Observe for dynamic audio windows
const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
        m.addedNodes.forEach(n => { if (n.id === 'audioWindow') makeDraggable(n); });
    });
});
observer.observe(document.body, { childList: true, subtree: true });

// Initialize draggables on load
const initializeDraggables = () => {
    document.querySelectorAll('.floating-audio-window').forEach(makeDraggable);
};

// This ensures all HTML is loaded before we try to find elements
document.addEventListener('DOMContentLoaded', () => {
    callManagerInstance.init(); // Initialize the call manager
    bindAttachButton();
    initializeDraggables();
});

// Expose needed functions to window
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
        switchToAudio,
        endAudioCall,
    });
    window.messageManagerInstance = messageManagerInstance;
    window.callManagerInstance = callManagerInstance;
} catch (e) {}