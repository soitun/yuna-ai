import json
import os
import uuid
import base64
import requests
from werkzeug.utils import secure_filename
from time import time
from flask import Flask, request, send_from_directory, redirect, url_for, jsonify, Response
from flask_login import LoginManager, UserMixin, login_required, logout_user, login_user, login_manager, current_user
from flask_cors import CORS
from itsdangerous import URLSafeTimedSerializer
from flask_compress import Compress
from aiflow import agi, history
import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)
config = agi.get_config()
serializer = URLSafeTimedSerializer("YourSecretKeyHere123!")
login_manager = LoginManager()

login_html = """
<!DOCTYPE html>
<html data-bs-theme="dark" lang="en">

<head data-bs-theme="dark">
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yuna Ai</title>
    <meta name="theme-color" content="#212529">
    <link rel="stylesheet" href="/static/css/bootstrap.min.css" rel="preload" as="style" media="all">
    <style>
        * {
            font-family: "yukiarimo" !important;
        }

        @font-face {
            font-family: "yukiarimo";
            src: url("/static/fonts/yukiarimo.woff") format("woff");
            font-style: normal;
            font-weight: normal;
        }
    </style>
</head>

<body>
    <!-- Login Modal -->
    <div class="modal-content bg-dark">
        <div class="modal-body">
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-md-9 col-lg-12 col-xl-10">
                        <div class="card o-hidden border-0 my-5">
                            <div class="card-body p-0">
                                <div class="row">
                                    <div class="col-lg-6">
                                        <div class="p-5">
                                            <form method="post" class="user">
                                                <h2 class="text-center mb-4">Change Password</h2>
                                                <input type="hidden" name="action" value="change_password">
                                                <div class="mb-3">
                                                    <input class="form-control form-control-user" type="password"
                                                        name="current_password" placeholder="Current Password" required>
                                                </div>
                                                <div class="mb-3">
                                                    <input class="form-control form-control-user" type="password"
                                                        name="new_password" placeholder="New Password" required>
                                                </div>
                                                <div class="mb-3">
                                                    <input class="form-control form-control-user" type="password"
                                                        name="confirm_new_password" placeholder="Confirm New Password"
                                                        required>
                                                </div>
                                                <button class="btn btn-primary btn-user w-100" type="submit">Change
                                                    Password</button>
                                            </form>
                                        </div>
                                    </div>

                                    <div class="col-lg-6">
                                        <div class="p-5">
                                            <form method="post" class="user">
                                                <h2 class="text-center mb-4">New User</h2>
                                                <input type="hidden" name="action" value="register">
                                                <div class="mb-3">
                                                    <input class="form-control form-control-user" type="text"
                                                        name="username" placeholder="Username" required>
                                                </div>
                                                <div class="mb-3">
                                                    <input class="form-control form-control-user" type="password"
                                                        name="password" placeholder="Password" required>
                                                </div>
                                                <button class="btn btn-primary btn-user w-100"
                                                    type="submit">Register</button>
                                            </form>
                                        </div>
                                    </div>

                                    <div class="col-lg-6">
                                        <div class="p-5">
                                            <form method="post" class="user">
                                                <h2 class="text-center mb-4">Login</h2>
                                                <input type="hidden" name="action" value="login">
                                                <div class="mb-3">
                                                    <input class="form-control form-control-user" type="text"
                                                        name="username" placeholder="Username" required>
                                                </div>
                                                <div class="mb-3">
                                                    <input class="form-control form-control-user" type="password"
                                                        name="password" placeholder="Password" required>
                                                </div>
                                                <button class="btn btn-primary btn-user w-100"
                                                    type="submit">Login</button>
                                            </form>
                                        </div>
                                    </div>

                                    <div class="col-lg-6">
                                        <div class="p-5">
                                            <form method="post" class="user">
                                                <h2 class="text-center mb-4">Delete Account</h2>
                                                <input type="hidden" name="action" value="delete_account">
                                                <div class="mb-3">
                                                    <input class="form-control form-control-user" type="text"
                                                        name="username" placeholder="Username" required>
                                                </div>
                                                <div class="mb-3">
                                                    <input class="form-control form-control-user" type="password"
                                                        name="password" placeholder="Password" required>
                                                </div>
                                                <button class="btn btn-primary btn-user w-100" type="submit">Delete
                                                    Account</button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="/static/js/bootstrap.min.js"></script>
</body>

</html>
"""

class YunaServer:
    def __init__(self):
        self.app = Flask(__name__, static_folder='static')
        self.app.config.update({
            'WTF_CSRF_ENABLED': False,
            'SECRET_KEY': 'Yuna_Ai_Secret_Key',
            'COMPRESS_MIMETYPES': ['text/html', 'text/css', 'text/xml', 'application/json', 'application/javascript', 'text/javascript', 'application/x-javascript'],
            'COMPRESS_LEVEL': 9,
            'COMPRESS_MIN_SIZE': 0
        })
        Compress(self.app)
        login_manager.init_app(self.app)
        login_manager.login_view = 'main'
        login_manager.user_loader(self.user_loader)
        CORS(self.app, resources={r"/*": {"origins": "*"}})
        self.configure_routes()
        self.chat_history_manager = history.ChatHistoryManager(config=config, use_file=True)
        self.worker = agi.AGIWorker(config)
        self.worker.start()
        self.app.errorhandler(404)(self.page_not_found)
        self.users_cache = None

        @self.app.after_request
        def add_cors_headers(response):
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            response.headers['Service-Worker-Allowed'] = '/'
            return response

        @self.app.after_request
        def add_cache_headers(response):
            if request.path.startswith('/static/'): response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
            return response

    @staticmethod
    def page_not_found(self): return f'This page does not exist.', 404

    # User model
    class User(UserMixin):
        def __init__(self, id=None): self.id = id

    @login_manager.user_loader
    def user_loader(self, user_id):
        if user_id in self.read_users(): return self.User(id=user_id)
        return None

    def read_users(self):
        if self.users_cache is not None: return self.users_cache
        users_file = 'db/admin/users.json'
        self.users_cache = json.load(open(users_file, 'r')) if os.path.exists(users_file) else {}
        return self.users_cache

    def write_users(self, users):
        self.users_cache = users
        json.dump(users, open('db/admin/users.json', 'w'))

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
        self.app.route('/search', methods=['GET'])(handle_kagi_search)
        self.app.route('/searchsuggest', methods=['GET'])(handle_kagisuggest)

    def custom_static(self, filename): return send_from_directory(self.app.static_folder, 'static/' + filename if not filename.startswith(('static/', '/favicon.ico', '/manifest.json')) else filename)
    def image_pwa(self): return send_from_directory(self.app.static_folder, 'img/yuna-ai.png')

    @login_required
    def logout(self):
        logout_user()
        return redirect(url_for('main'))

    def main(self):
        if current_user.is_authenticated: return send_from_directory('.', 'index.html')
        if request.method == 'GET': return login_html

        action = request.form['action']
        username = request.form['username']
        password = request.form['password']
        users = self.read_users()

        if users.get(username) != password and action != 'register': return send_from_directory('.', 'index.html')
        if action == 'register' and username in users:
            users[username] = password
            self.write_users(users)
            os.makedirs(f'db/history/{username}', exist_ok=True)

        elif action == 'login':
            user = self.User()
            user.id = username
            login_user(user)
            return redirect(url_for('main'))

        elif action == 'change_password':
            users[username] = request.form['new_password']
            self.write_users(users)

        elif action == 'change_username':
            new_username = request.form['new_username']
            users[new_username] = password
            del users[username]
            self.write_users(users)
            os.rename(f'db/history/{username}', f'db/history/{new_username}')

        elif action == 'delete_account':
            del users[username]
            self.write_users(users)
            logout_user()
            os.rmdir(f'db/history/{username}')
        return send_from_directory('.', 'index.html')

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
            yield f"data: {json.dumps({'done': True, 'ai_message_id': ai_message_id, 'full_response': response_text})}\n\n"

            if speech: worker.speak_text(response_text)

        return Response(generate_stream(), mimetype='text/event-stream', headers={'Cache-Control': 'no-cache', 'Connection': 'keep-alive'})
    else:
        if isinstance(response_gen, str): response_text = response_gen
        else: response_text = ''.join(list(response_gen))

        ai_message_id = None
        if useHistory: ai_message_id = update_chat_history(chat_history_manager, user_id, chat_id, text, response_text, config, message_obj.get('id') if append_user else None, attachments_info_for_history if append_user else None, append_user=append_user)
        if speech: worker.speak_text(response_text)

        print("Response:", response_text)
        return jsonify({'response': response_text, 'ai_message_id': ai_message_id})

@login_required
def handle_audio_request(worker):
    task = request.form.get('task')

    if task == 'transcribe':
        audio_file = request.files.get('audio')
        audio_path = 'static/audio/audio.wav'
        audio_file.save(audio_path)
        return jsonify({'text': worker.transcribe_audio(audio_path)})
    elif task == 'tts':
        worker.speak_text(request.form.get('text'))
        return jsonify({'response': 'Text-to-speech executed'})

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
    audio_url = worker.speak_text(yuna_text)
    return jsonify({'user_text': user_text, 'yuna_text': yuna_text, 'audio_url': f'/{audio_url}'})

@login_required
def handle_kagi_search():
    try:
        query = request.args.get('q', '')
        limit = request.args.get('limit', 20)
        api_key = request.headers.get('X-Kagi-Key')
        
        if not api_key:
            return jsonify({'error': 'API key required'}), 400
        
        response = requests.get(
            f'https://kagi.com/api/v0/search',
            params={'q': query, 'limit': limit},
            headers={'Authorization': f'Bot {api_key}'}
        )
        
        if response.status_code != 200:
            return jsonify({'error': f'Search failed: {response.status_code}'}), response.status_code
        
        return jsonify(response.json())
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
if __name__ == '__main__': app.run(host='0.0.0.0', port=4848, ssl_context=('/Users/yuki/Library/Containers/io.tailscale.ipn.macos/Data/cert.pem', '/Users/yuki/Library/Containers/io.tailscale.ipn.macos/Data/key.pem'), debug=True, threaded=True) # (certificate, keyfile)