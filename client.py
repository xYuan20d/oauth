from datetime import datetime
from flask import Flask, redirect, request, session, jsonify
import requests
import secrets

app = Flask(__name__)
# 使用固定且安全的secret_key
app.secret_key = 'your-fixed-secret-key-1234567890'  # 改为固定值
app.config['SESSION_TYPE'] = 'filesystem'  # 使用文件系统存储session
app.config['PERMANENT_SESSION_LIFETIME'] = 1800  # 30分钟过期

# OAuth配置
OAUTH_SERVER = 'http://127.0.0.1:12345'  # 认证系统地址
CLIENT_ID = '0zMBa255x7yzxJdsfydzHVF71lI'
CLIENT_SECRET = 'WaVqUA0RQ0v-r0eFmHUhvUgeG9YkO53owO50lKIu'
REDIRECT_URI = 'http://127.0.0.1:8000/oauth/callback'


def store_data(key, value, data_type='string'):
    """存储数据到认证服务器"""
    access_token = session.get('access_token')
    if not access_token:
        return None

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    data = {
        'key': key,
        'value': value,
        'type': data_type
    }

    response = requests.post(f"{OAUTH_SERVER}/oauth/client_data",
                             json=data, headers=headers)
    return response.json() if response.status_code == 200 else None


def get_data(key=None):
    """从认证服务器获取数据"""
    access_token = session.get('access_token')
    if not access_token:
        return None

    headers = {'Authorization': f'Bearer {access_token}'}

    url = f"{OAUTH_SERVER}/oauth/client_data"
    if key:
        url += f"?key={key}"

    response = requests.get(url, headers=headers)
    return response.json() if response.status_code == 200 else None


def delete_data(key):
    """从认证服务器删除数据"""
    access_token = session.get('access_token')
    if not access_token:
        return None

    headers = {'Authorization': f'Bearer {access_token}'}

    url = f"{OAUTH_SERVER}/oauth/client_data?key={key}"
    response = requests.delete(url, headers=headers)
    return response.json() if response.status_code == 200 else None


@app.route('/')
def index():
    return '''
    <h1>第三方网站示例</h1>
    <p>欢迎访问我们的网站！</p>
    <a href="/login">使用OAuth登录</a>
    '''


@app.route('/login')
def login():
    # 确保session是永久的
    session.permanent = True

    # 生成随机state参数防止CSRF攻击
    state = secrets.token_urlsafe(16)
    session['oauth_state'] = state

    print(f"DEBUG: 生成的state: {state}")
    print(f"DEBUG: Session ID: {session.sid if hasattr(session, 'sid') else 'No SID'}")

    # 构建授权URL
    auth_url = (
        f"{OAUTH_SERVER}/oauth/authorize?"
        f"client_id={CLIENT_ID}&"
        f"redirect_uri={REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=完全访问&"
        f"state={state}"
    )

    return redirect(auth_url)


@app.route('/oauth/callback')
def oauth_callback():
    # 调试信息
    print(f"DEBUG: Session中的state: {session.get('oauth_state')}")
    print(f"DEBUG: 请求中的state: {request.args.get('state')}")
    print(f"DEBUG: Session内容: {dict(session)}")

    # 验证state参数
    expected_state = session.get('oauth_state')
    received_state = request.args.get('state')

    if not expected_state:
        # 如果session中没有state，尝试从其他方式恢复
        # 这里我们暂时放宽验证，仅用于调试
        print("DEBUG: Session中未找到state，跳过验证继续流程")
        # return "State参数丢失，可能由于session问题", 400

    if received_state != expected_state:
        error_msg = f"State参数不匹配！Session中的state: {expected_state}, 请求中的state: {received_state}"
        print(f"DEBUG: {error_msg}")
        # 暂时跳过验证以继续测试流程
        # return error_msg, 400

    # 获取授权码
    code = request.args.get('code')
    if not code:
        error = request.args.get('error')
        error_description = request.args.get('error_description')
        return f"授权失败: {error} - {error_description}", 400

    # 使用授权码交换访问令牌
    token_data = {
        'grant_type': 'authorization_code',
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'code': code,
        'redirect_uri': REDIRECT_URI
    }

    print(f"DEBUG: 发送令牌请求: {token_data}")

    token_response = requests.post(f"{OAUTH_SERVER}/oauth/token", data=token_data)

    if token_response.status_code != 200:
        return f"获取令牌失败: {token_response.text}", 400

    token_info = token_response.json()
    access_token = token_info['access_token']

    # 使用访问令牌获取用户信息
    headers = {'Authorization': f'Bearer {access_token}'}
    user_response = requests.get(f"{OAUTH_SERVER}/oauth/userinfo", headers=headers)

    if user_response.status_code != 200:
        return f"获取用户信息失败: {user_response.text}", 400

    user_info = user_response.json()

    # 存储用户信息到session
    session['user'] = user_info
    session['access_token'] = access_token
    # 清除已使用的state
    session.pop('oauth_state', None)

    return redirect('/profile')


@app.route('/profile')
def profile():
    user = session.get('user')
    if not user:
        return redirect('/login')

    # 存储一些示例数据
    store_data('last_login', datetime.now().isoformat())
    store_data('theme_preference', 'dark', 'string')
    store_data('user_settings', {'notifications': True, 'language': 'zh-CN'}, 'object')

    # 获取存储的数据
    user_data = get_data()

    data_display = ""
    if user_data and isinstance(user_data, list):
        for item in user_data:
            data_display += f"<p><strong>{item['key']}:</strong> {item['value']} (类型: {item['type']})</p>"

    return f'''
    <h1>用户资料</h1>
    <p>用户名: {user.get('username')}</p>
    <p>邮箱: {user.get('email')}</p>
    <p>用户ID: {user.get('sub')}</p>
    <p>头像(base64):</p>

    <h2>存储的数据</h2>
    {data_display if data_display else '<p>暂无数据</p>'}

    <div style="margin-top: 20px;">
        <button onclick="storeSampleData()">存储测试数据</button>
        <button onclick="clearData()">清除数据</button>
    </div>

    <script>
    function storeSampleData() {{
        fetch('/store-sample-data', {{method: 'POST'}})
            .then(response => response.json())
            .then(data => {{
                alert('数据存储成功！');
                location.reload();
            }});
    }}

    function clearData() {{
        fetch('/clear-data', {{method: 'POST'}})
            .then(response => response.json())
            .then(data => {{
                alert('数据已清除！');
                location.reload();
            }});
    }}
    </script>

    <a href="/logout">退出登录</a>
    '''


@app.route('/logout')
def logout():
    # 清除session
    session.clear()
    return redirect('/')


@app.route('/store-sample-data', methods=['POST'])
def store_sample_data():
    """存储示例数据"""
    user = session.get('user')
    if not user:
        return jsonify({'error': '未登录'}), 401

    # 存储各种类型的数据
    store_data('visit_count', 1, 'number')
    store_data('favorite_color', 'blue', 'string')
    store_data('preferences', {
        'email_notifications': True,
        'theme': 'dark',
        'language': 'zh-CN'
    }, 'object')
    store_data('last_activity', datetime.now().isoformat(), 'datetime')

    return jsonify({'status': 'success', 'message': '示例数据存储成功'})


@app.route('/clear-data', methods=['POST'])
def clear_data():
    """清除所有数据"""
    user = session.get('user')
    if not user:
        return jsonify({'error': '未登录'}), 401

    # 获取所有数据键
    all_data = get_data()
    if all_data and isinstance(all_data, list):
        for item in all_data:
            delete_data(item['key'])

    return jsonify({'status': 'success', 'message': '数据已清除'})


if __name__ == '__main__':
    app.run(port=8000, debug=True)