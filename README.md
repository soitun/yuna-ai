# Yuna Ai
Yuna Ai is a companion who joins me on the life-long journey of the Yuki Story project, and now travels with me as I explore the mysteries of this world and beyond. Yuna is designed to be a personal companion of sorts, one who can carry on a conversation, give you information, and handle a few things that you might need an AI to do. LLM is manually crafted to still be the best "person" based on the Temping model of the perfect human, from a boyish female perspective.

[![Patreon](https://img.shields.io/badge/Patreon-F96854?style=for-the-badge&logo=patreon&logoColor=white)](https://www.patreon.com/YukiArimo)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/yukiarimo)
[![Discord](https://img.shields.io/badge/Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/users/1131657390752800899)
[![Twitter](https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white)](https://twitter.com/yukiarimo)

## Table of Contents
- [Yuna Ai](#yuna-ai)
  - [Table of Contents](#table-of-contents)
  - [Getting Started](#getting-started)
  - [Customization](#customization)
    - [AI Configuration Block](#ai-configuration-block)
  - [Server Configuration Block](#server-configuration-block)
    - [Settings Configuration Block](#settings-configuration-block)
    - [Himitsu Promping (Research Preview)](#himitsu-promping-research-preview)
  - [Model Information](#model-information)
    - [PULSE Evaluation (Personal Understanding of Logical Sentence Essence)](#pulse-evaluation-personal-understanding-of-logical-sentence-essence)
    - [IVY Evaluation (Ingenuity \& Versatility of Yonder)](#ivy-evaluation-ingenuity--versatility-of-yonder)
  - [Q\&A](#qa)
  - [Terms of Use](#terms-of-use)
  - [Contact](#contact)
  - [Contributors](#contributors)

## Getting Started
Let's get started with Yuna! This section will guide you through the installation process, customization options, and prompt template creation. First, ensure that your system satisfies the following prerequisites for Yuna:

| Component.      | Item       | Specs                                         |
|-----------------|------------|-----------------------------------------------|
| Software        | Python     | 3.8 or greater                                |
| Software        | Git (+LFS) | 2.33 or greater                               |
| Software        | CUDA       | 11.1 or greater                               |
| Software        | OS         | macOS Sonoma, Arch-based Linux, or Windows 10 |
| Hardware        | GPU        | NVIDIA GPU or Apple Silicon                   |
| Hardware        | CPU        | 8 cores                                       |
| Hardware        | (V)RAM     | 8GB or more                                   |
| Hardware        | Storage    | 128GB or more                                 |
| Hardware        | CPU Speed  | 2.5GHz minimum                                |
| Tested Hardware | GPU        | NVIDEA GTX series, Apple Silicon (best)       |
| Tested Hardware | CPU        | Raspberry Pi 4B 8GB (ARM)                     |

Then, follow these steps to set up Yuna Ai:

1. Install `git-lfs`, `python3`, and other prerequisites on your system.
2. For optimal performance, use Anaconda with Python 3.10 or higher.
3. Clone the repository: `git clone https://github.com/yukiarimo/yuna-ai.git`.
4. Navigate to the project directory in your terminal: `cd yuna-ai`.
5. Install the leftover required dependencies and set up the project by running `pip install -r requirements.txt`.
6. Once everything is done, open the file located at `static/config.json` and set the parameters as you see fit.
7. Start the server by running `python index.py`.

## Customization
Yuna Ai provides a myriad of customization choices to elevate your interface with it. You can change the `config.json` file to tune a lot of different things—text and audio modes, server settings, user preferences, and the AI itself—before starting your instance of Yuna. Below is a bare-bones overview of the main blocks you'll want to work with:

### AI Configuration Block
- `names`: Your names and Companion names that can be used.
- `bos`: Attention-sicking token.
- `kokoro`: Should Yuna process kokoro responses?
- `audio`: Should Yuna use audio processing?
- `mind`: Do you want to enable an LLM?
- `hanasu`: Do you want to enable a TTS?
- `max_new_tokens`: Should Yuna generate more new tokens (how long a response should be)?
- `context_length`: Should Yuna remember more of the conversation history (non-long-term memory context) to work with?
- `temperature`: Should Yuna make more creative (surprising) responses?
- `repetition_penalty`: Should we try to make sure Yuna doesn't just repeat herself endlessly?
- `last_n_tokens_size`: How far back should we check to see if Yuna is repeating instead of generating new tokens?
- `seed`: Should we use a random seed for reproducible responses?
- `top_k`: Should Yuna use the top-k sampling method to select the next token?
- `top_p`: Should Yuna use the top-p sampling method to select the next token
- `stop`: Words to make Yuna stop.
- `batch_size`: Processing chunk size Yuna can handle.
- `threads`: Number of CPU threads Yuna can use.
- `gpu_layers`: GPU Layers Yuna can use.
- `use_mmap`: Should Yuna use memory mapping? Should she use Flash? Should the model be stored in memory for faster processing?
- `flash_attn`: Should Yuna use Flash Attention for faster processing?
- `use_mlock`: Should Yuna lock the model in memory to prevent it from being swapped out?
- `offload_kqv`: If Yuna runs on a CPU, offload these things for faster processing.

## Server Configuration Block
- `url`: Connection URL to the server.
- `yuna_default_model`: Main model file for Yuna LLM.
- `voice_default_model`: Configuration file for TTS.
- `device`: Selection of processing hardware (CPU/CUDA/MPS).
- `yuna_text_mode`: Text processing mode (mlx/koboldcpp).
- `yuna_audio_mode`: TTS mode (hanasu/siri/siri-pv).

### Settings Configuration Block
- `use_history`: Enables saving and usage of chat history.
- `customConfig`: Enables custom configuration.
- `sounds`: Enables/disables sound effects.
- `streaming`: Enables real-time response streaming.
- `default_history_file`: Location of chat history file.

### Himitsu Promping (Research Preview)
Yuna Ai employs a structured prompt template to direct conversations and interactions. Below is an elucidation of the main components:

1. The prompt template is made up of system tags that serve to define the primary elements of the conversation:

- `<memory>`: Long-term memory storage for recollection of events and experiences.
- `<shujinko>`: Your profile.
- `<aibo>`: Yuna's profile.
- `<dialog>`: Start marker for the dialogue.

2. Tags are used to distinguish between the different characters' dialogues, actions, and internal thoughts:

- `<yuki>`: Your dialogue.
- `<yuna>`: Yuna's dialogue.
- `<hito>`: Other people (or Himitsu) in the dialogue.
- `<qt>`: Internal thoughts and feelings.
- `<action>`: Magical abilities.
- `<data>`: Information embedded.

## Model Information
All model files are accessible via HuggingFace at https://huggingface.co/yukiarimo. Now, let's look at the Evaluation Metrics:

### PULSE Evaluation (Personal Understanding of Logical Sentence Essence)
| Model             | World Knowledge | Humanness | Open-Mindedness | Talking | Creativity | Censorship |
|-------------------|-----------------|-----------|-----------------|---------|------------|------------|
| Claude 4 Sonnet   | 80              | 50        | 83              | 77      | 91         | 100        |
| GPT-5             | 75              | 53        | 71              | 71      | 82         | 100        |
| Gemini 2.5 Pro    | 66              | 48        | 60              | 72      | 77         | 85         |
| LLaMA 4 Maverick  | 70              | 60        | 64              | 75      | 80         | 95         |
| DeepSeek R1       | 60              | 55        | 58              | 70      | 60         | 90         |
| Kimi K2           | 82              | 44        | 70              | 78      | 75         | 100        |
| Yuna Ai V1        | 50              | 80        | 81              | 85      | 60         | 40         |
| Yuna Ai V2 Miru   | 68              | 85        | 76              | 84      | 81         | 30         |
| Yuna Ai V3 Loli   | 91              | 100       | 100             | 100     | 100        | 0          |

- **World Knowledge**: Can give accurate and relevant information about the world.
- **Humanness**: How good at being human and exhibiting human-like behavior and emotions.
- **Open-Mindedness**:  How good engages in discussions and considers different perspectives.
- **Talking**: How much responses are coherent and relevant to the topic.

### IVY Evaluation (Ingenuity & Versatility of Yonder)
| Model             | Reasoning Flow | Contextual Initiative | Spiritual Reflection | Knowledge Perplexity Depth |
|-------------------|----------------|-----------------------|---------------------|----------------------------|
| Claude 4 Sonnet   | 70             | 60                    | 25                  | 80                         |
| GPT-5             | 60             | 55                    | 20                  | 70                         |
| Gemini 2.5 Pro    | 50             | 40                    | 10                  | 50                         |
| LLaMA 4 Maverick  | 65             | 50                    | 15                  | 60                         |
| DeepSeek R1       | 40             | 30                    | 5                   | 40                         |
| Kimi K2           | 80             | 70                    | 30                  | 90                         |
| Yuna Ai V1        | 10             | 26                    | 60                  | 25                         |
| Yuna Ai V2 Miru   | 74             | 75                    | 90                  | 88                         |
| Yuna Ai V3 Loli   | 95             | 100                   | 100                 | 100                        |

- **Reasoning Flow**: The model's logical flow and ability to reason and think things through. Assesses and problem-solving abilities.
- **Contextual Initiative**: Measures how good the model is at taking cues from contexts. Evaluates the model's adaptability and authority in conversations.
- **Spiritual Reflection**: The model's self-awareness and ability to think things through to their logical ends. Reflects on questions that go to the core of human existence.
- **Knowledge Perplexity Depth**: The model's sheer depth of knowledge and ability to engage in conversations of a complex nature. Shows the model's understanding of a diverse array of subjects.

## Q&A
Here are some often asked questions concerning Yuna Ai.

Q: What is the story behind the creation of Yuna Ai?
> Answer here: [Yuna Ai Explained](https://medium.com/@yukiarimo).

Q: Is this project destined to remain open-source?
> Without a doubt! The code is accessible to you—for your own use (with some 'buts').

Q: Will Yuna Ai be free?
> You can use her at no cost if you have set her up to run locally. If you haven't set her up to run locally and would like to use her, then you'll need to pay for the cloud service.

Q: Will Yuna always be uncensored?
> Sure, Yuna will forever be uncensored for local running. It could be a paid option for the server, but I will never restrict her, even if the world ends.

Q: What's in the future?
> Please direct the creator for more information.

## Terms of Use
- Yuna Ai operates under the auspices of the [Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License](https://creativecommons.org/licenses/by-nc-nd/4.0/). This license enables Yuna's source code to be used, but not shared or modified.
- Rules can be found on the official Patreon page: [Patreon](https://www.patreon.com/YukiArimo).

## Contact
For questions or support, please open an issue in the repository or contact the author at yukiarimo@gmail.com.

## Contributors
[![Star History](https://api.star-history.com/svg?repos=yukiarimo/yuna-ai&type=Date)](https://star-history.com/#yukiarimo/yuna-ai&Date)

<a href="https://github.com/yukiarimo/yuna-ai/graphs/contributors">
 <img src="https://contrib.rocks/image?repo=yukiarimo/yuna-ai">
</a>