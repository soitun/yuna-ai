import json
import os
import uuid
import base64
import requests
import re
from werkzeug.utils import secure_filename
from time import time
from flask import Flask, request, send_from_directory, redirect, url_for, jsonify, Response
from flask_login import LoginManager, UserMixin, login_required, logout_user, login_user, login_manager, current_user
from flask_cors import CORS
from itsdangerous import URLSafeTimedSerializer
from flask_compress import Compress
from aiflow import agi, history
from aiflow.utils import get_config, clearText
from datetime import timedelta
import subprocess
import shutil
import logging
from aiflow.models.hanasu.text import cleaned_text_to_sequence, split_and_process_text
from aiflow.models.hanasu.models import build_duration_multipliers_from_ids, build_noise_profile_from_ids, load_model
from aiflow.parse import parse
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)
config = agi.get_config()
serializer = URLSafeTimedSerializer("YourSecretKeyHere123!")
login_manager = LoginManager()

login_html = """
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yuna Ai</title>
    <meta name="theme-color" content="#212529">
    <link rel="stylesheet" href="/static/css/index.css">
</head>

<body>
    <!-- Login Modal -->
    <div class="login-container">
        <div class="login-card glassy-surface">
            <div class="login-header">
                <img src="/static/img/yuna-ai.png" alt="Yuna AI" class="login-logo">
                <h2>Welcome to Yuna AI</h2>
            </div>

            <div class="login-forms">
                <!-- Login Form -->
                <form method="post" class="login-form active" id="loginForm">
                    <input type="hidden" name="action" value="login">
                    <div class="form-group">
                        <input class="form-input" type="text" name="username" placeholder="Username" required>
                    </div>
                    <div class="form-group">
                        <input class="form-input" type="password" name="password" placeholder="Password" required>
                    </div>
                    <button class="liquid-button w-100" type="submit">Login</button>
                </form>

                <!-- Register Form -->
                <form method="post" class="login-form" id="registerForm" style="display: none;">
                    <input type="hidden" name="action" value="register">
                    <div class="form-group">
                        <input class="form-input" type="text" name="username" placeholder="New Username" required>
                    </div>
                    <div class="form-group">
                        <input class="form-input" type="password" name="password" placeholder="New Password" required>
                    </div>
                    <button class="liquid-button w-100" type="submit">Register</button>
                </form>
            </div>

            <div class="login-footer">
                <button class="text-button" onclick="toggleForms()">Need an account? Register</button>
            </div>
        </div>
    </div>

    <script>
        function toggleForms() {
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
            const toggleBtn = document.querySelector('.text-button');

            if (loginForm.style.display === 'none') {
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
                toggleBtn.textContent = 'Need an account? Register';
            } else {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
                toggleBtn.textContent = 'Already have an account? Login';
            }
        }
    </script>
</body>

</html>
"""

    # User model
class User(UserMixin):
    def __init__(self, id=None): self.id = id

class YunaServer:
    def __init__(self):
        self.app = Flask(__name__, static_folder='static')
        self.app.config.update({
            'WTF_CSRF_ENABLED': False,
            'SECRET_KEY': 'Yuna_Ai_Secret_Key',
            'COMPRESS_MIMETYPES': ['text/html', 'text/css', 'text/xml', 'application/json', 'application/javascript', 'text/javascript', 'application/x-javascript'],
            'COMPRESS_LEVEL': 9,
            'COMPRESS_MIN_SIZE': 0,
            'REMEMBER_COOKIE_DURATION': timedelta(days=365),
            'PERMANENT_SESSION_LIFETIME': timedelta(days=365),
            'SESSION_COOKIE_SECURE': True,
            'SESSION_COOKIE_SAMESITE': 'Lax'
        })
        Compress(self.app)
        login_manager.init_app(self.app)
        login_manager.login_view = 'main'

        # Register user_loader with bound method
        login_manager.user_loader(self.user_loader)

        CORS(self.app, resources={r"/*": {"origins": "*"}})
        self.configure_routes()
        self.chat_history_manager = history.ChatHistoryManager(config=config, use_file=True)
        self.worker = agi.AGIWorker(config)
        self.worker.start()
        @self.app.after_request
        def add_cache_headers(response):
            if request.path.startswith('/static/'): response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
            return response

    @staticmethod
    def page_not_found(self): return f'This page does not exist.', 404

    def user_loader(self, user_id):
        # print(f"Loading user: {user_id}") # Debug
        if user_id in self.read_users(): return User(id=user_id)
        return None

    def read_users(self):
        users_file = 'db/users.json'
        if not os.path.exists('db'): os.makedirs('db')
        if not os.path.exists(users_file):
            # Auto-create with default admin if missing
            default_users = {"admin": "admin"}
            self.write_users(default_users)
            return default_users

        try:
            return json.load(open(users_file, 'r'))
        except json.JSONDecodeError:
            return {}

    def write_users(self, users):
        users_file = 'db/users.json'
        if not os.path.exists('db'): os.makedirs('db')
        json.dump(users, open(users_file, 'w'))

    def configure_routes(self):
        self.app.route('/', methods=['GET', 'POST'])(self.main)
        self.app.route('/<path:filename>')(self.custom_static)
        self.app.route('/index.html', methods=['GET', 'POST'])(self.main)
        self.app.route('/apple-touch-icon.png')(self.image_pwa)
        self.app.route('/history', methods=['POST'], endpoint='history')(lambda: handle_history_request(self.chat_history_manager))
        self.app.route('/message', methods=['POST'], endpoint='message')(lambda: handle_message_request(self.worker, self.chat_history_manager, config))
        self.app.route('/audio', methods=['GET', 'POST'], endpoint='audio')(lambda: handle_audio_request(self.worker))
        self.app.route('/call', methods=['POST'], endpoint='call')(lambda: handle_call_request(self.worker, self.chat_history_manager, config))
        self.app.route('/analyze', methods=['POST'], endpoint='textfile')(lambda: handle_textfile_request(self.chat_generator))
        self.app.route('/logout', methods=['GET'])(self.logout)
        self.app.route('/search', methods=['GET'], endpoint='search')(lambda: handle_kagi_search())
        self.app.route('/search/history', methods=['GET', 'DELETE'], endpoint='search_history')(lambda: handle_search_history_request())
        self.app.route('/analyze_search', methods=['POST'], endpoint='analyze_search')(lambda: handle_analyze_search())
        self.app.route('/suggest', methods=['GET'], endpoint='suggest')(lambda: handle_kagisuggest())
        self.app.route('/user_data', methods=['GET', 'POST'])(handle_user_data_request)

    def custom_static(self, filename): return send_from_directory(self.app.static_folder, 'static/' + filename if not filename.startswith(('static/', '/favicon.ico', '/manifest.json')) else filename)
    def image_pwa(self): return send_from_directory(self.app.static_folder, 'img/yuna-ai.png')

    @login_required
    def logout(self):
        logout_user()
        return redirect(url_for('main'))

    def main(self):
        if current_user.is_authenticated: return send_from_directory('.', 'index.html')

        if request.method == 'POST':
            action = request.form.get('action')
            username = request.form.get('username')
            password = request.form.get('password')
            users = self.read_users()

            if action == 'login':
                if username in users and users[username] == password:
                    user = User(id=username)
                    login_user(user, remember=True)
                    return redirect(url_for('main'))
                else:
                    return login_html.replace('Login', 'Login Failed - Try Again')

            elif action == 'register':
                if username and password:
                    if username in users:
                        return login_html.replace('New User', 'Username Taken')
                    users[username] = password
                    self.write_users(users)
                    os.makedirs(f'db/history/{username}', exist_ok=True)

                    user = User(id=username)
                    login_user(user, remember=True)
                    return redirect(url_for('main'))

            elif action == 'change_password':
                current_pw = request.form.get('current_password')
                new_pw = request.form.get('new_password')
                confirm_pw = request.form.get('confirm_new_password')

                # Since we are not logged in, we can't really change password securely without knowing the user
                # But the form implies we might be?
                # Actually, the original code handled this in the main route which is weird if not logged in.
                # Let's assume this action is only reachable if we somehow know the user or it's a public form (bad security).
                # For now, I'll leave it but it likely won't work well without being logged in.
                pass

            elif action == 'delete_account':
                if username in users and users[username] == password:
                    del users[username]
                    self.write_users(users)
                    shutil.rmtree(f'db/history/{username}', ignore_errors=True)
                    return redirect(url_for('main'))

        return login_html

# --- TTS Functions ---

        return None, None

def update_chat_history(chat_history_manager, user_id, chat_id, text, response, config, messageId, attachments_info=None, append_user=True):
    chat_history = chat_history_manager.load_chat_history(user_id, chat_id)

    if append_user:
        if messageId is None: messageId = f"msg-{int(time() * 1000)}"
        user_message = {"name": config['ai']['names'][0], "text": text, "id": messageId}
        if attachments_info:
            user_message["data"] = attachments_info
            user_message["type"] = "image" if any(att.get('type') == 'image' for att in attachments_info) else "text"
        else:
            user_message["data"] = None
            user_message["type"] = "text"
        chat_history.append(user_message)

    # Always append the AI message
    ai_message_id = f"msg-ai-{uuid.uuid4()}"
    ai_message = {"name": config['ai']['names'][1], "text": response, "data": None, "type": "text", "id": ai_message_id}
    chat_history.append(ai_message)
    chat_history_manager.save_chat_history(chat_history, user_id, chat_id)
    return ai_message_id

@login_required
def handle_history_request(chat_history_manager):
    data = request.get_json()
    chat_id = data.get('chat')
    task = data.get('task')
    user_id = current_user.get_id()

    responses = {
        'load': lambda: chat_history_manager.load_chat_history(user_id, chat_id),
        'list': lambda: chat_history_manager.list_history_files(user_id),
        'edit': lambda: {'response': 'History edited successfully'} if chat_history_manager.save_chat_history(data.get('history'), user_id, chat_id) is None else None,
        'save': lambda: {'response': 'History saved successfully'} if chat_history_manager.save_chat_history(data.get('history'), user_id, chat_id) is None else None,
        'create': lambda: {'response': 'History created successfully'} if chat_history_manager.create_chat_history_file(user_id, chat_id) is None else None,
        'delete': lambda: {'response': 'History deleted successfully'} if chat_history_manager.delete_chat_history_file(user_id, chat_id) is None else None,
        'rename': lambda: {'response': 'History renamed successfully'} if chat_history_manager.rename_chat_history_file(user_id, chat_id, data.get('name')) is None else None,
        'delete_message': lambda: {'response': 'Message deleted successfully'} if chat_history_manager.delete_message(user_id, chat_id, data.get('message_id')) is None else None,
        'edit_message': lambda: {'response': 'Message edited successfully'} if chat_history_manager.edit_message(user_id, chat_id, data.get('message_id'), data.get('new_text')) is None else None,
        'delete_all_below': lambda: {'response': 'Messages deleted successfully'} if chat_history_manager.delete_all_below(user_id, chat_id, data.get('message_id')) is None else None,
        'delete_from_message': lambda: {'response': 'Messages deleted successfully'} if chat_history_manager.delete_from_message(user_id, chat_id, data.get('message_id')) is None else None
    }

    if task in responses: return jsonify(responses[task]())
    return jsonify({'error': 'Invalid task parameter'}), 400

@login_required
def handle_message_request(worker, chat_history_manager, config):
    data = request.get_json()
    message_obj = data.get('message', {})
    chat_id = data.get('chat')
    speech = data.get('speech', False)
    kanojo = data.get('kanojo')
    useHistory = data.get('useHistory', False)
    stream = data.get('stream', False)
    regenerate = data.get('regenerate', False)
    messageId = message_obj.get('id')
    yuna_config = worker.config if data.get('yunaConfig') else None
    user_id = current_user.get_id()
    chat_history = chat_history_manager.load_chat_history(user_id, chat_id)
    append_user = True

    if regenerate:
        idx = next((i for i, m in enumerate(chat_history) if m.get('id') == messageId), -1)
        if idx != -1:
            chat_history = chat_history[:idx]
            chat_history_manager.save_chat_history(chat_history, user_id, chat_id)
            append_user = False
            last_user_message = chat_history[-1] if chat_history else {}
            text = last_user_message.get('text', '')
            attachments = last_user_message.get('data', [])
        else:
            regenerate = False
            text = message_obj.get('text', '')
            attachments = message_obj.get('data', [])
    else:
        text = message_obj.get('text', '')
        attachments = message_obj.get('data', [])

    processed_text = text
    image_paths_for_vlm = []
    attachments_info_for_history = []

    if attachments:
        upload_dir = os.path.join('static', 'img', 'call')
        text_upload_dir = os.path.join('static', 'text')
        os.makedirs(upload_dir, exist_ok=True)
        os.makedirs(text_upload_dir, exist_ok=True)
        text_contents = []
        for attachment in attachments:
            if attachment.get('type') == 'text':
                text_content = attachment.get('content', '')
                text_contents.append(text_content)

                if append_user:
                    original_name = attachment.get('name', 'uploaded_file.txt')
                    safe_filename = secure_filename(original_name)
                    unique_filename = f"{uuid.uuid4()}_{safe_filename}"
                    text_path = os.path.join(text_upload_dir, unique_filename)
                    with open(text_path, "w", encoding='utf-8') as file: file.write(text_content)
                    web_path = f"/{text_path}"
                    attachments_info_for_history.append({"type": "text", "path": web_path, "name": original_name, "content": text_content})

            elif attachment.get('type', '').startswith('image/'):
                if not append_user and attachment.get('path'):
                    existing_path = attachment.get('path', '').lstrip('/')
                    if os.path.exists(existing_path): image_paths_for_vlm.append(existing_path)

                elif append_user:
                    original_name = attachment.get('name', 'uploaded_image.jpg')
                    safe_filename = secure_filename(original_name)
                    unique_filename = f"{uuid.uuid4()}_{safe_filename}"
                    image_path = os.path.join(upload_dir, unique_filename)
                    image_data = attachment.get('content', '')
                    with open(image_path, "wb") as file: file.write(base64.b64decode(image_data))
                    image_paths_for_vlm.append(image_path)
                    web_path = f"/{image_path}"
                    attachments_info_for_history.append({"type": "image", "path": web_path, "name": original_name})

            elif attachment.get('type', '').startswith('audio/'):
                 if append_user:
                    original_name = attachment.get('name', 'uploaded_audio.wav')
                    safe_filename = secure_filename(original_name)
                    unique_filename = f"{uuid.uuid4()}_{safe_filename}"
                    audio_path = os.path.join('static', 'audio', unique_filename)
                    audio_data = attachment.get('content', '')
                    with open(audio_path, "wb") as file: file.write(base64.b64decode(audio_data))

                    # Transcribe
                    transcription = worker.transcribe_audio(audio_path)
                    text_contents.append(f"[Audio Transcription]: {transcription}")

                    web_path = f"/{audio_path}"
                    attachments_info_for_history.append({"type": "audio", "path": web_path, "name": original_name, "transcription": transcription})

            elif attachment.get('type', '').startswith('video/'):
                 if append_user:
                    original_name = attachment.get('name', 'uploaded_video.mp4')
                    safe_filename = secure_filename(original_name)
                    unique_filename = f"{uuid.uuid4()}_{safe_filename}"
                    video_path = os.path.join(upload_dir, unique_filename)
                    video_data = attachment.get('content', '')
                    with open(video_path, "wb") as file: file.write(base64.b64decode(video_data))

                    # Extract frames
                    output_pattern = os.path.join(upload_dir, f"{unique_filename}_frame_%03d.jpg")
                    # fps=1/3 means 1 frame every 3 seconds. scale='min(720,iw)':-1 scales so the smallest dimension is at most 720?
                    # User said: "limit resolution to 720 pixels at the longest (any side)."
                    # So if w > h, w=720, h=-1. If h > w, h=720, w=-1.
                    # ffmpeg filter: "scale='if(gt(iw,ih),720,-1)':'if(gt(iw,ih),-1,720)'"
                    try:
                        subprocess.run([
                            'ffmpeg', '-i', video_path,
                            '-vf', "fps=1/3,scale='if(gt(iw,ih),720,-1)':'if(gt(iw,ih),-1,720)'",
                            output_pattern
                        ], check=True, capture_output=True)

                        # Find generated frames
                        frame_files = sorted([f for f in os.listdir(upload_dir) if f.startswith(f"{unique_filename}_frame_")])
                        for frame in frame_files:
                            frame_path = os.path.join(upload_dir, frame)
                            image_paths_for_vlm.append(frame_path)

                        web_path = f"/{video_path}"
                        attachments_info_for_history.append({"type": "video", "path": web_path, "name": original_name})
                    except Exception as e:
                        print(f"Error processing video: {e}")
                        text_contents.append("[Error processing video attachment]")

        if text_contents:
            text_data = ''.join([f"<data>{content}</data>" for content in text_contents])
            processed_text = f"{text}{text_data}" if text else text_data

    response_gen = worker.generate_text(processed_text, kanojo, chat_history, useHistory, yuna_config, stream, image_paths=image_paths_for_vlm, append_current_user=append_user)

    if stream:
        def generate_stream():
            response_text = ''
            ai_message_id = None

            for chunk in response_gen:
                response_text += chunk
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"

            if useHistory: ai_message_id = update_chat_history(chat_history_manager, user_id, chat_id, text, response_text, config, message_obj.get('id') if append_user else None, attachments_info_for_history if append_user else None, append_user=append_user)

            audio_b64 = None
            if speech:
                try:
                    # Use worker.speak_text
                    filename, audio_bytes = worker.speak_text(response_text)
                    if audio_bytes:
                        audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
                except Exception as e:
                    print(f"TTS Error: {e}")

            # Send completion event with message ID and audio
            yield f"data: {json.dumps({'done': True, 'ai_message_id': ai_message_id, 'full_response': response_text, 'audio': audio_b64})}\n\n"

        return Response(generate_stream(), mimetype='text/event-stream', headers={'Cache-Control': 'no-cache', 'Connection': 'keep-alive'})
    else:
        if isinstance(response_gen, str): response_text = response_gen
        else: response_text = ''.join(list(response_gen))

        ai_message_id = None
        if useHistory: ai_message_id = update_chat_history(chat_history_manager, user_id, chat_id, text, response_text, config, message_obj.get('id') if append_user else None, attachments_info_for_history if append_user else None, append_user=append_user)

        # For non-streaming, we can still return audio if requested, but JSON response is expected.
        # The user asked to "send the raw audio bytes ... to the client".
        # If not streaming text, maybe we return a URL or base64 audio in JSON?
        # "Please send the raw audio bytes ... and play it there instead of saving file"
        # If I return JSON, I can include base64 audio.

        audio_b64 = None
        if speech:
             try:
                filename, audio_bytes = worker.speak_text(response_text)
                if audio_bytes:
                    audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
             except Exception as e:
                 print(f"TTS Error: {e}")

        print("Response:", response_text)
        return jsonify({'response': response_text, 'ai_message_id': ai_message_id, 'audio': audio_b64})

@login_required
def handle_user_data_request():
    user_id = current_user.get_id()
    user_dir = f'db/history/{user_id}'
    os.makedirs(user_dir, exist_ok=True)

    if request.method == 'GET':
        data_type = request.args.get('type')
        if not data_type: return jsonify({'error': 'Missing type parameter'}), 400

        file_path = os.path.join(user_dir, f'{data_type}.json')
        if not os.path.exists(file_path):
            if data_type == 'config':
                # Return default config mapped to camelCase for frontend
                ai_config = config.get('ai', {})
                default_config = {
                    'maxNewTokens': ai_config.get('max_new_tokens', 1024),
                    'contextLength': ai_config.get('context_length', 16384),
                    'temperature': ai_config.get('temperature', 0.7),
                    'repetitionPenalty': ai_config.get('repetition_penalty', 1.11),
                    'lastNTokensSize': ai_config.get('last_n_tokens_size', 128),
                    'seed': ai_config.get('seed', -1),
                    'topK': ai_config.get('top_k', 40),
                    'topP': ai_config.get('top_p', 0.9),
                    'stop': ai_config.get('stop', []),
                    'batchSize': ai_config.get('batch_size', 512),
                    'threads': ai_config.get('threads', 8),
                    'gpuLayers': ai_config.get('gpu_layers', -1)
                }
                # Save this default as the user's starting config
                with open(file_path, 'w') as f: json.dump(default_config, f, indent=4)
                return jsonify(default_config)

            # Create with default empty dict if missing for other types
            with open(file_path, 'w') as f: json.dump({}, f)
            return jsonify({})

        try:
            return jsonify(json.load(open(file_path, 'r')))
        except:
            return jsonify({})

    elif request.method == 'POST':
        data = request.get_json()
        data_type = data.get('type')
        content = data.get('content')

        if not data_type or content is None: return jsonify({'error': 'Missing type or content'}), 400

        # Security check for filename
        if not re.match(r'^[a-zA-Z0-9_]+$', data_type):
            return jsonify({'error': 'Invalid data type'}), 400

        file_path = os.path.join(user_dir, f'{data_type}.json')
        with open(file_path, 'w') as f:
            json.dump(content, f, indent=4)

        return jsonify({'status': 'success'})

@login_required
def handle_audio_request(worker):
    from flask import current_app
    task = request.form.get('task')

    if task == 'transcribe':
        audio_file = request.files.get('audio')
        audio_path = 'static/audio/audio.wav'
        audio_file.save(audio_path)
        return jsonify({'text': worker.transcribe_audio(audio_path)})
    elif task == 'tts':
        text = request.form.get('text')
        # Use worker.speak_text
        try:
            filename, audio_bytes = worker.speak_text(text)
            import io
            return Response(io.BytesIO(audio_bytes), mimetype='audio/wav')
        except Exception as e:
            print(f"TTS Error: {e}")
            return jsonify({'error': str(e)}), 500

    return jsonify({'error': 'Invalid task'}), 400

@login_required
def handle_search_request(worker):
    data = request.json
    task = data.get('task')
    if task == 'html': return jsonify({'response': worker.scrape_webpage(data.get('url'))})

    search_query = data.get('query')
    _ = data.get('processData', False)
    answer, search_results, image_urls = worker.web_search(search_query)

    return jsonify({'message': [answer, search_results], 'images': image_urls})

@login_required
def handle_textfile_request(chat_generator):
    text_file = request.files.get('text')
    query = request.form.get('query', '')
    text_file.save('static/text/content.txt')
    result = chat_generator.processTextFile('static/text/content.txt', query, 0.6)
    return jsonify({'response': result})

@login_required
def handle_call_request(worker, chat_history_manager, config):
    audio_file = request.files['audio']
    user_id = current_user.get_id()

    temp_audio_dir = os.path.join('static', 'audio', 'temp')
    os.makedirs(temp_audio_dir, exist_ok=True)
    temp_audio_path = os.path.join(temp_audio_dir, f"{uuid.uuid4()}.wav")
    audio_file.save(temp_audio_path)

    user_text = worker.transcribe_audio(temp_audio_path)
    chat_id = request.form.get('chat_id')
    kanojo = request.form.get('kanojo')
    useHistory = request.form.get('useHistory') == 'true'
    chat_history = chat_history_manager.load_chat_history(user_id, chat_id)
    yuna_text = worker.generate_text(user_text, kanojo, chat_history, useHistory, config)
    user_message_id = f"msg-{int(time() * 1000)}"

    update_chat_history(chat_history_manager, user_id, chat_id, user_text, yuna_text, config, user_message_id)
    audio_url, audio_bytes = worker.speak_text(yuna_text)

    audio_b64 = None
    if audio_bytes:
        audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')

    return jsonify({'user_text': user_text, 'yuna_text': yuna_text, 'audio_url': f'/{audio_url}' if audio_url else None, 'audio_b64': audio_b64})

@login_required
def handle_kagi_search():
    try:
        query = request.args.get('q', '')
        limit = request.args.get('limit', 20)
        api_key = request.headers.get('X-Kagi-Key')
        force_new = request.args.get('force', 'false') == 'true'

        if not api_key:
            return jsonify({'error': 'API key required'}), 400

        user_id = current_user.get_id()
        history_dir = f'db/history/{user_id}'
        os.makedirs(history_dir, exist_ok=True)
        history_file = os.path.join(history_dir, 'search_history.json')

        search_history = {}
        if os.path.exists(history_file):
            try:
                with open(history_file, 'r') as f:
                    search_history = json.load(f)
            except:
                pass

        # Check cache
        if not force_new and query in search_history:
            return jsonify(search_history[query])

        # Fetch from API
        response = requests.get(
            f'https://kagi.com/api/v0/search',
            params={'q': query, 'limit': limit},
            headers={'Authorization': f'Bot {api_key}'}
        )

        if response.status_code != 200:
            return jsonify({'error': f'Search failed: {response.status_code}'}), response.status_code

        data = response.json()

        # Save to history
        search_history[query] = data
        with open(history_file, 'w') as f:
            json.dump(search_history, f, indent=4)

        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@login_required
def handle_search_history_request():
    user_id = current_user.get_id()
    history_dir = f'db/history/{user_id}'
    os.makedirs(history_dir, exist_ok=True)
    history_file = os.path.join(history_dir, 'search_history.json')

    search_history = {}
    if os.path.exists(history_file):
        try:
            with open(history_file, 'r') as f:
                search_history = json.load(f)
        except:
            pass

    if request.method == 'GET':
        # Return list of queries
        return jsonify(list(search_history.keys()))

    elif request.method == 'DELETE':
        query = request.args.get('q')
        if query:
            if query in search_history:
                del search_history[query]
        else:
            # Clear all
            search_history = {}

        with open(history_file, 'w') as f:
            json.dump(search_history, f, indent=4)
        return jsonify({'success': True})

@login_required
def handle_analyze_search():
    if not parse:
        return jsonify({'error': 'Parser not available'}), 501

    url = request.json.get('url')
    if not url:
        return jsonify({'error': 'URL required'}), 400

    try:
        title, content = parse(url=url)
        return jsonify({'title': title, 'content': content})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def handle_kagisuggest():
    query = request.args.get('q', '')
    try:
        resp = requests.get(f'https://kagisuggest.com/api/autosuggest', params={'q': query})
        return (resp.content, resp.status_code, {'Content-Type': resp.headers.get('Content-Type', 'application/json')})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

app = YunaServer().app
if __name__ == '__main__': app.run(host='0.0.0.0', port=4848, ssl_context=('/Users/yuki/Library/Containers/io.tailscale.ipn.macos/Data/cert.pem', '/Users/yuki/Library/Containers/io.tailscale.ipn.macos/Data/key.pem'), debug=False, threaded=True) # (certificate, keyfile)