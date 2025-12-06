config_data = {
    "ai": {
        "names": ["Yuki", "Yuna"],
        "bos": ["<|endoftext|>", true],
        "kokoro": false,
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
        "yuna_default_model": ["lib/models/yuna/yuna-ai-v4-miru-mlx"],
        "voice_default_model": ["lib/models/agi/hanasu/yuna-ai-voice-v1/config.json", "lib/models/hanasu/yuna-ai-voice-v1/G_158000.pth"],
        "device": "mps",
        "yuna_text_mode": "yunamlx",
        "yuna_audio_mode": "hanasu",
    },
    "settings": {
        "use_history": true,
        "customConfig": true,
        "sounds": true,
        "streaming": true,
        "default_history_file": "chat.json"
    }
};

// Simple chat manager - always uses chat.json
class ChatHistoryManager {
    constructor() {
        this.selectedFilename = 'chat.json';
    }

    async loadSelectedHistory() {
        try {
            const response = await fetch('/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task: 'load', chat: this.selectedFilename })
            });

            if (!response.ok) {
                if (response.redirected || response.status === 401 || response.status === 403) {
                    console.warn('Session expired or invalid, redirecting to login.');
                    window.location.href = '/';
                    return;
                }
                throw new Error(`Server returned ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn('Received non-JSON response (likely HTML login page), redirecting.');
                window.location.href = '/';
                return;
            }

            const history = await response.json();

            if (messageManagerInstance) {
                const container = messageManagerInstance.ensureContainer();
                if (container) {
                    container.innerHTML = '';
                    history.forEach(msg => messageManagerInstance.renderMessage(msg));
                }
            }
        } catch (err) {
            console.error('Error loading history:', err);
        }
    }
}

const chatHistoryManagerInstance = new ChatHistoryManager();

const applySettings = () => {
    document.getElementById('useHistory').checked = config_data.settings.use_history;
    document.getElementById('customConfig').checked = config_data.settings.customConfig;
    document.getElementById('sounds').checked = config_data.settings.sounds;
    document.getElementById('streamToggle').checked = config_data.settings.streaming;
};

document.addEventListener('DOMContentLoaded', () => {
    applySettings();
    chatHistoryManagerInstance.loadSelectedHistory();
});