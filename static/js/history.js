config_data = {
    "ai": {
        "names": ["Yuki", "Yuna"],
        "himitsu": false,
        "emotions": false,
        "miru": false,
        "audio": false,
        "mind": false,
        "hanasu": false,
        "max_new_tokens": 1024,
        "context_length": 16384,
        "temperature": 0.7,
        "repetition_penalty": 1.11,
        "last_n_tokens_size": 128,
        "seed": -1,
        "top_k": 100,
        "top_p": 1,
        "stop": ["<yuki>", "</yuki>", "<yuna>", "</yuna>", "<hito>", "</hito>", "<data>", "</data>", "<kanojo>", "</kanojo>"],
        "batch_size": 2048,
        "threads": 8,
        "gpu_layers": -1,
        "use_mmap": true,
        "flash_attn": true,
        "use_mlock": true,
        "offload_kqv": true
    },
    "server": {
        "url": "",
        "yuna_default_model": "lib/models/yuna/yuna-ai-v4-miru-mlx",
        "miru_default_model": ["lib/models/yuna/yuna-ai-v4-miru-q5_k_m.gguf", "lib/models/yuna/yuna-ai-v4-miru-eye-q5_k_m.gguf"],
        "yuna_himitsu_model": "lib/models/yuna/himitsu-v1-mlx",
        "voice_model_config": ["lib/models/agi/hanasu/yuna-ai-voice-v1/config.json", "lib/models/agi/hanasu/yuna-ai-voice-v1/G_158000.pth"],
        "device": "mps",
        "yuna_text_mode": "mlxvlm",
        "yuna_himitsu_mode": "mlx",
        "yuna_miru_mode": "mlxvlm",
        "yuna_audio_mode": "hanasu",
        "yuna_reference_audio": "static/audio/reference.wav"
    },
    "settings": {
        "fuctions": true,
        "use_history": true,
        "customConfig": true,
        "sounds": true,
        "background_call": true,
        "streaming": true,
        "default_history_file": "history_template:general.json",
        "default_kanojo": "Yuna"
    },
    "security": {
        "secret_key": "YourSecretKeyHere123!",
        "encryption_key": "zWZnu-lxHCTgY_EqlH4raJjxNJIgPlvXFbdk45bca_I=",
        "11labs_key": "Your11LabsKeyHere123!"
    }
};

// ChatHistoryManager Implementation
class ChatHistoryManager {
    constructor() {
        this.apiBaseUrl = `${config_data?.server?.url}` || '';
        this.chats = [];
        this.selectedFilename = '';
    }

    // Fetch all chats from the server 
    async fetchChats() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task: 'list' })
            });

            if (!response.ok) throw new Error(`Error fetching chats: ${response.statusText}`);

            const data = await response.json();
            this.chats = data.history || data;
            return this.chats;
        } catch (error) {
            console.error(error);
            alert('Failed to load chat history from the server.');
            return [];
        }
    }

    // Add a new chat/history file
    async createHistoryFile() {
        const newFileName = prompt('Enter a name for the new file (with .json):');
        if (!newFileName) return;

        try {
            await this.postHistory('create', { chat: newFileName });
            await populateHistorySelect();
            this.selectedFilename = newFileName;
        } catch (error) {
            console.error(error);
            alert('Failed to create new chat.');
        }
    }

    // Load selected chat history
    async loadSelectedHistory(filename = config_data?.settings?.default_history_file) {
        try {
            const data = await this.postHistory('load', { chat: filename });
            const chatContainer = document.getElementById('chatContainer');
            if (chatContainer) {
                chatContainer.innerHTML = '';
            }

            if (Array.isArray(data)) {
                data.forEach(message => {
                    // Ensure data field is present
                    if (!message.data) message.data = null;
                    messageManagerInstance.renderMessage(message);
                });
            }

            this.selectedFilename = filename;

            if (typeof updateMsgCount === 'function') {
                updateMsgCount();
            }
        } catch (error) {
            console.error(error);
            alert('Failed to load chat history.');
        }
    }

    // Download a chat history file
    async downloadChat(filename) {
        try {
            const data = await this.postHistory('load', { chat: filename });
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
        } catch (error) {
            console.error(error);
            alert('Failed to download chat.');
        }
    }

    // Delete a chat history file
    async deleteChat(filename) {
        if (!confirm('Are you sure you want to delete this chat?')) return;

        try {
            await this.postHistory('delete', { chat: filename });
            await populateHistorySelect();
            if (this.selectedFilename === filename) {
                this.selectedFilename = config_data?.settings?.default_history_file;
            }
        } catch (error) {
            console.error(error);
            alert('Failed to delete chat.');
        }
    }

    // Rename a chat history file
    async renameChat(oldName, newName) {
        if (!newName) return;

        try {
            await this.postHistory('rename', { 
                chat: oldName,
                name: newName 
            });
            await populateHistorySelect();
            if (this.selectedFilename === oldName) {
                this.selectedFilename = newName;
            }
        } catch (error) {
            console.error(error);
            alert('Failed to rename chat.');
        }
    }

    // Helper method for history API calls
    async postHistory(task, data = {}) {
        const response = await fetch(`${this.apiBaseUrl}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task, ...data })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    }
}

// Initialize manager and bind UI events
const chatHistoryManagerInstance = new ChatHistoryManager();

document.addEventListener('DOMContentLoaded', () => {
    // Load initial chat list
    populateHistorySelect();

    // Bind create button if exists
    const createChatButton = document.getElementById('createChatButton');
    if (createChatButton) {
        createChatButton.addEventListener('click', () => chatHistoryManagerInstance.createHistoryFile());
    }
});

// Helper function to render chat list UI
function renderChatList(chats) {
    const chatList = document.getElementById('chatList');
    if (!chatList) return;

    chatList.innerHTML = chats.map(filename => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <span class="chat-name">${filename}</span>
            <div class="btn-group">
                <button class="btn btn-sm btn-primary me-1" onclick="chatHistoryManagerInstance.loadSelectedHistory('${filename}')">Open</button>
                <button class="btn btn-sm btn-secondary me-1" onclick="chatHistoryManagerInstance.renameChat('${filename}', prompt('Enter new name:', '${filename}'))">Rename</button>
                <button class="btn btn-sm btn-secondary me-1" onclick="chatHistoryManagerInstance.downloadChat('${filename}')">Download</button>
                <button class="btn btn-sm btn-danger" onclick="chatHistoryManagerInstance.deleteChat('${filename}')">Delete</button>
            </div>
        </li>
    `).join('');
}

function updateMsgCount() {
    const container = document.getElementById('chatContainer');
    const count = container ? container.children.length : 0;
    // Update count display if you have one
    const countDisplay = document.getElementById('messageCount');
    if (countDisplay) {
        countDisplay.textContent = count;
    }
    return count;
}

// Helper function to populate history select
async function populateHistorySelect() {
    const chats = await chatHistoryManagerInstance.fetchChats();
    renderChatList(chats);
    return chats;
}

chatHistoryManagerInstance.loadSelectedHistory(config_data.server.default_history_file);

const applySettings = () => {
    const { settings } = config_data || {};
    if (!settings) return;

    // Map config settings to checkbox IDs
    const settingsMap = {
        'pseudo_api': 'pseudoApi',
        'fuctions': 'functions', 
        'notifications': 'notifications',
        'customConfig': 'customConfig',
        'sounds': 'sounds',
        'use_history': 'useHistory',
        'background_call': 'backgroundCall',
        'nsfw_filter': 'nsfw',
        'streaming': 'streaming'
    };

    // Apply each setting to corresponding checkbox
    Object.entries(settingsMap).forEach(([settingKey, elementId]) => {
        const checkbox = document.getElementById(elementId);
        if (checkbox && typeof settings[settingKey] === 'boolean') {
            checkbox.checked = settings[settingKey];
        }
    });
};

applySettings();