import os
import requests
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_from_directory, abort
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
from datetime import datetime, timedelta
import json
# from dotenv import load_dotenv
# load_dotenv()

# 初始化Flask应用
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key'

# 数据库配置
USE_MYSQL = os.getenv('USE_MYSQL', 'False').lower() in ('true', '1', 't')

if USE_MYSQL:
    # MySQL配置
    MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
    MYSQL_PORT = os.getenv('MYSQL_PORT', '3306')
    MYSQL_USER = os.getenv('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
    MYSQL_DB = os.getenv('MYSQL_DB', 'oauth_server')

    app.config[
        'SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}'
    print(f"使用MySQL数据库: {MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}")
else:
    # SQLite配置
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
    print("使用SQLite数据库: users.db")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 设置唯一的session cookie名称
app.config['SESSION_COOKIE_NAME'] = 'main_session'
app.config['SESSION_COOKIE_PATH'] = '/'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = False  # 开发环境设为False，生产环境应为True

app.jinja_env.globals.update(requests=requests)

# 初始化SQLAlchemy
db = SQLAlchemy(app)

# 初始化LoginManager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'


# 数据库兼容性包装类
class DatabaseCompat:
    """数据库兼容性包装类，统一SQLite和MySQL的API差异"""

    @staticmethod
    def distinct(column):
        """统一的distinct函数"""
        from sqlalchemy import distinct
        return distinct(column)

    @staticmethod
    def text_type():
        """统一的文本类型"""
        from sqlalchemy import Text
        return Text

    @staticmethod
    def string_type(length):
        """统一的字符串类型"""
        from sqlalchemy import String
        return String(length)

    @staticmethod
    def datetime_type():
        """统一的日期时间类型"""
        from sqlalchemy import DateTime
        return DateTime

    @staticmethod
    def integer_type():
        """统一的整数类型"""
        from sqlalchemy import Integer
        return Integer

    @staticmethod
    def boolean_type():
        """统一的布尔类型"""
        from sqlalchemy import Boolean
        return Boolean


# 用户模型 - 使用足够长的VARCHAR类型
class User(UserMixin, db.Model):
    id = db.Column(DatabaseCompat.integer_type(), primary_key=True)
    username = db.Column(DatabaseCompat.string_type(150), unique=True, nullable=False)
    # 使用足够长的VARCHAR类型存储密码哈希
    password_hash = db.Column(DatabaseCompat.string_type(500), nullable=False)
    email = db.Column(DatabaseCompat.string_type(150))

    # OAuth相关
    oauth_clients = db.relationship('OAuthClient', backref='user', lazy=True)
    authorization_codes = db.relationship('AuthorizationCode', backref='user', lazy=True)
    access_tokens = db.relationship('AccessToken', backref='user', lazy=True)


# 在main.py中添加以下模型
class ClientUserData(db.Model):
    id = db.Column(DatabaseCompat.integer_type(), primary_key=True)
    client_id = db.Column(DatabaseCompat.string_type(40), nullable=False)  # 第三方客户端ID
    user_id = db.Column(DatabaseCompat.integer_type(), db.ForeignKey('user.id'), nullable=False)  # 用户ID
    data_key = db.Column(DatabaseCompat.string_type(200), nullable=False)  # 数据键名
    data_value = db.Column(DatabaseCompat.text_type())  # 数据值（JSON格式）
    data_type = db.Column(DatabaseCompat.string_type(50))  # 数据类型
    created_at = db.Column(DatabaseCompat.datetime_type(), default=datetime.utcnow)
    updated_at = db.Column(DatabaseCompat.datetime_type(), default=datetime.utcnow, onupdate=datetime.utcnow)

    # 唯一约束：同一客户端同一用户的相同键名只能有一条记录
    __table_args__ = (db.UniqueConstraint('client_id', 'user_id', 'data_key', name='_client_user_key_uc'),)


# OAuth客户端模型 - 使用足够长的VARCHAR类型
class OAuthClient(db.Model):
    id = db.Column(DatabaseCompat.integer_type(), primary_key=True)
    client_id = db.Column(DatabaseCompat.string_type(40), unique=True, nullable=False)
    # 使用足够长的VARCHAR类型存储客户端密钥
    client_secret = db.Column(DatabaseCompat.string_type(500), nullable=False)
    client_name = db.Column(DatabaseCompat.string_type(100), nullable=False)
    redirect_uris = db.Column(DatabaseCompat.text_type(), nullable=False)  # JSON格式的URI列表
    user_id = db.Column(DatabaseCompat.integer_type(), db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(DatabaseCompat.datetime_type(), default=datetime.utcnow)


# 授权码模型 - 使用足够长的VARCHAR类型
class AuthorizationCode(db.Model):
    id = db.Column(DatabaseCompat.integer_type(), primary_key=True)
    # 使用足够长的VARCHAR类型存储授权码
    code = db.Column(DatabaseCompat.string_type(500), unique=True, nullable=False)
    client_id = db.Column(DatabaseCompat.string_type(40), nullable=False)
    redirect_uri = db.Column(DatabaseCompat.string_type(200), nullable=False)
    scope = db.Column(DatabaseCompat.text_type())  # 权限范围
    expires_at = db.Column(DatabaseCompat.datetime_type(), nullable=False)
    user_id = db.Column(DatabaseCompat.integer_type(), db.ForeignKey('user.id'), nullable=False)
    used = db.Column(DatabaseCompat.boolean_type(), default=False)


# 访问令牌模型 - 使用足够长的VARCHAR类型
class AccessToken(db.Model):
    id = db.Column(DatabaseCompat.integer_type(), primary_key=True)
    # 使用足够长的VARCHAR类型存储访问令牌
    token = db.Column(DatabaseCompat.string_type(500), unique=True, nullable=False)
    client_id = db.Column(DatabaseCompat.string_type(40), nullable=False)
    scope = db.Column(DatabaseCompat.text_type())
    expires_at = db.Column(DatabaseCompat.datetime_type(), nullable=False)
    user_id = db.Column(DatabaseCompat.integer_type(), db.ForeignKey('user.id'), nullable=False)


# 创建数据库表（在app_context内）
with app.app_context():
    db.create_all()


# 加载用户
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# 注册路由
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        email = request.form.get('email', '')

        # 检查用户名是否已存在
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash('用户名已存在!', 'error')
            return redirect(url_for('register'))

        # 检查密码和确认密码是否一致
        if password != confirm_password:
            flash('密码和确认密码不一致，请重新输入!', 'error')
            return redirect(url_for('register'))

        # 密码哈希
        password_hash = generate_password_hash(password)

        # 创建用户对象并存入数据库
        new_user = User(username=username, password_hash=password_hash, email=email)
        db.session.add(new_user)
        db.session.commit()

        flash('注册成功！', 'success')
        return redirect(url_for('login'))

    return render_template('register.html')


# 登录路由
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        # 查找用户
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            flash('登录成功!', 'success')

            # 如果是从OAuth授权流程跳转过来的，重定向到授权页面
            next_page = request.args.get('next')
            if next_page and '/oauth/authorize' in next_page:
                return redirect(next_page)
            return redirect(url_for('dashboard'))
        flash('用户名或密码错误!', 'error')
        return redirect(url_for('login'))
    return render_template('login.html')


# 用户面板
@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user=current_user)


@app.route('/settings')
@login_required
def settings():
    return render_template('settings.html', user=current_user)


# 登出路由
@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))


# OAuth客户端管理
@app.route('/oauth/clients')
@login_required
def oauth_clients():
    clients = OAuthClient.query.filter_by(user_id=current_user.id).all()

    # 解析每个客户端的重定向URI
    for client in clients:
        try:
            # 尝试解析JSON格式的URI
            client.redirect_uris_parsed = json.loads(client.redirect_uris)
        except json.JSONDecodeError:
            # 如果解析失败，使用原始格式（每行一个）
            client.redirect_uris_parsed = [uri.strip() for uri in client.redirect_uris.split('\n') if uri.strip()]

    return render_template('clients.html', clients=clients)


@app.route('/oauth/clients/create', methods=['GET', 'POST'])
@login_required
def create_oauth_client():
    if request.method == 'POST':
        client_name = request.form['client_name']
        redirect_uris_text = request.form['redirect_uris']

        # 修复：将重定向URI转换为JSON格式存储
        redirect_uris_list = [uri.strip() for uri in redirect_uris_text.split('\n') if uri.strip()]
        redirect_uris_json = json.dumps(redirect_uris_list)

        # 生成客户端ID和密钥
        client_id = secrets.token_urlsafe(20)
        client_secret = secrets.token_urlsafe(30)

        # 创建客户端
        client = OAuthClient(
            client_id=client_id,
            client_secret=client_secret,
            client_name=client_name,
            redirect_uris=redirect_uris_json,  # 存储为JSON
            user_id=current_user.id
        )

        db.session.add(client)
        db.session.commit()

        flash(f'OAuth客户端创建成功！客户端ID: {client_id}', 'success')
        return redirect(url_for('oauth_clients'))

    return render_template('create_client.html')


# OAuth授权端点
@app.route('/oauth/authorize', methods=['GET', 'POST'])
@login_required
def oauth_authorize():
    # 获取参数
    client_id = request.args.get('client_id')
    redirect_uri = request.args.get('redirect_uri')
    response_type = request.args.get('response_type')
    scope = request.args.get('scope', '')
    state = request.args.get('state')

    # 验证客户端是否存在
    client = OAuthClient.query.filter_by(client_id=client_id).first()
    if not client:
        return jsonify(error='invalid_client', error_description='无效的客户端'), 400

    # 🔧 修改：不再验证客户端所有者，允许任何用户授权给任何客户端
    # 这是标准OAuth行为：客户端开发者创建应用，其他用户可以使用它

    # 修复：处理重定向URI的解析
    try:
        # 首先尝试解析为JSON（新格式）
        allowed_uris = json.loads(client.redirect_uris)
    except json.JSONDecodeError:
        # 如果JSON解析失败，假设是旧格式（每行一个URI）
        allowed_uris = [uri.strip() for uri in client.redirect_uris.split('\n') if uri.strip()]

    # 验证重定向URI
    if redirect_uri not in allowed_uris:
        return jsonify(error='invalid_redirect_uri', error_description='无效的重定向URI'), 400

    # 验证响应类型
    if response_type != 'code':
        return jsonify(error='unsupported_response_type', error_description='不支持的响应类型'), 400

    if request.method == 'POST':
        # 用户同意授权
        if 'confirm' in request.form:
            # 生成授权码
            code = secrets.token_urlsafe(30)
            expires_at = datetime.utcnow() + timedelta(minutes=10)

            authorization_code = AuthorizationCode(
                code=code,
                client_id=client_id,
                redirect_uri=redirect_uri,
                scope=scope,
                expires_at=expires_at,
                user_id=current_user.id  # 当前授权用户的ID
            )

            db.session.add(authorization_code)
            db.session.commit()

            # 重定向到客户端
            params = {'code': code}
            if state:
                params['state'] = state

            from urllib.parse import urlencode
            redirect_url = f"{redirect_uri}?{urlencode(params)}"
            return redirect(redirect_url)
        else:
            # 用户拒绝授权
            return jsonify(error='access_denied', error_description='用户拒绝授权'), 403

    # 显示授权页面
    return render_template('authorize.html',
                           client=client,
                           redirect_uri=redirect_uri,
                           scope=scope,
                           state=state,
                           user=current_user)


# OAuth令牌端点
@app.route('/oauth/token', methods=['POST'])
def oauth_token():
    grant_type = request.form.get('grant_type')
    client_id = request.form.get('client_id')
    client_secret = request.form.get('client_secret')
    code = request.form.get('code')
    redirect_uri = request.form.get('redirect_uri')

    # 验证客户端凭证
    client = OAuthClient.query.filter_by(client_id=client_id).first()
    if not client or client.client_secret != client_secret:
        return jsonify(error='invalid_client', error_description='无效的客户端凭证'), 401

    if grant_type == 'authorization_code':
        # 验证授权码
        auth_code = AuthorizationCode.query.filter_by(
            code=code,
            client_id=client_id,
            used=False
        ).first()

        if not auth_code:
            return jsonify(error='invalid_grant', error_description='无效的授权码'), 400

        if auth_code.expires_at < datetime.utcnow():
            return jsonify(error='invalid_grant', error_description='授权码已过期'), 400

        if auth_code.redirect_uri != redirect_uri:
            return jsonify(error='invalid_grant', error_description='重定向URI不匹配'), 400

        # 🔧 修改：不再验证授权码用户与客户端所有者的一致性
        # 这是标准行为：任何用户都可以授权给任何客户端

        # 标记授权码为已使用
        auth_code.used = True

        # 生成访问令牌
        access_token = secrets.token_urlsafe(40)
        refresh_token = secrets.token_urlsafe(40)
        expires_at = datetime.utcnow() + timedelta(days=30)

        token = AccessToken(
            token=access_token,
            client_id=client_id,
            scope=auth_code.scope,
            expires_at=expires_at,
            user_id=auth_code.user_id  # 使用授权码对应的用户ID
        )

        db.session.add(token)
        db.session.commit()

        return jsonify({
            'access_token': access_token,
            'token_type': 'Bearer',
            'expires_in': 30 * 24 * 3600,  # 三十天
            'refresh_token': refresh_token,
            'scope': auth_code.scope
        })

    return jsonify(error='unsupported_grant_type', error_description='不支持的授权类型'), 400


# 用户信息端点
@app.route('/oauth/userinfo')
def oauth_userinfo():
    # 从Authorization头获取访问令牌
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify(error='invalid_token', error_description='无效的访问令牌'), 401

    access_token = auth_header[7:]  # 去掉'Bearer '前缀

    # 验证访问令牌
    token = AccessToken.query.filter_by(token=access_token).first()
    if not token:
        return jsonify(error='invalid_token', error_description='无效的访问令牌'), 401

    if token.expires_at < datetime.utcnow():
        return jsonify(error='invalid_token', error_description='访问令牌已过期'), 401

    # 获取用户信息
    user = User.query.get(token.user_id)

    # 返回用户信息（根据scope决定返回哪些字段）
    user_info = {
        'sub': str(user.id),
        'username': user.username,
        'email': user.email
    }

    return jsonify(user_info)


@app.route('/oauth/clients/<int:client_id>/delete', methods=['POST'])
@login_required
def delete_oauth_client(client_id):
    client = OAuthClient.query.filter_by(id=client_id, user_id=current_user.id).first()

    if not client:
        flash('客户端不存在或您没有权限删除!', 'error')
        return redirect(url_for('oauth_clients'))

    try:
        # 删除相关的授权码和访问令牌
        AuthorizationCode.query.filter_by(client_id=client.client_id).delete()
        AccessToken.query.filter_by(client_id=client.client_id).delete()

        # 删除客户端
        db.session.delete(client)
        db.session.commit()

        flash('客户端删除成功!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'删除客户端时出错: {str(e)}', 'error')

    return redirect(url_for('oauth_clients'))


# 更新令牌撤销功能
@app.route('/oauth/revoke', methods=['POST'])
def oauth_revoke():
    token = request.form.get('token')
    token_type_hint = request.form.get('token_type_hint', 'access_token')

    if token_type_hint == 'access_token':
        access_token = AccessToken.query.filter_by(token=token).first()
        if access_token:
            db.session.delete(access_token)
            db.session.commit()
    # 可以扩展支持撤销刷新令牌

    return jsonify({'status': 'success'})


# 存储第三方网站数据的端点
@app.route('/oauth/client_data', methods=['POST', 'PUT'])
def store_client_data():
    # 验证访问令牌
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify(error='invalid_token', error_description='无效的访问令牌'), 401

    access_token = auth_header[7:]
    token = AccessToken.query.filter_by(token=access_token).first()

    if not token or token.expires_at < datetime.utcnow():
        return jsonify(error='invalid_token', error_description='无效或过期的访问令牌'), 401

    # 🔧 修复：只验证客户端存在，不验证客户端所有者
    client = OAuthClient.query.filter_by(client_id=token.client_id).first()
    if not client:
        return jsonify(
            error='invalid_client',
            error_description='客户端不存在'
        ), 401

    # 获取请求数据
    data = request.get_json()
    if not data or 'key' not in data:
        return jsonify(error='invalid_request', error_description='缺少数据键名'), 400

    key = data['key']
    value = data.get('value')
    data_type = data.get('type', 'string')

    # 查找或创建数据记录 - 使用 token 中的用户ID
    client_data = ClientUserData.query.filter_by(
        client_id=token.client_id,
        user_id=token.user_id,  # 🔧 使用令牌中的用户ID，不是客户端所有者ID
        data_key=key
    ).first()

    if client_data:
        # 更新现有数据
        client_data.data_value = json.dumps(value) if value else None
        client_data.data_type = data_type
        client_data.updated_at = datetime.utcnow()
    else:
        # 创建新数据
        client_data = ClientUserData(
            client_id=token.client_id,
            user_id=token.user_id,  # 🔧 使用令牌中的用户ID
            data_key=key,
            data_value=json.dumps(value) if value else None,
            data_type=data_type
        )
        db.session.add(client_data)

    db.session.commit()

    return jsonify({
        'status': 'success',
        'key': key,
        'message': '数据存储成功'
    })


# 读取第三方网站数据的端点
@app.route('/oauth/client_data', methods=['GET'])
def get_client_data():
    # 验证访问令牌
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify(error='invalid_token', error_description='无效的访问令牌'), 401

    access_token = auth_header[7:]
    token = AccessToken.query.filter_by(token=access_token).first()

    if not token or token.expires_at < datetime.utcnow():
        return jsonify(error='invalid_token', error_description='无效或过期的访问令牌'), 401

    # 获取查询参数
    key = request.args.get('key')

    if key:
        # 获取特定键的数据
        client_data = ClientUserData.query.filter_by(
            client_id=token.client_id,
            user_id=token.user_id,  # 🔧 使用令牌中的用户ID
            data_key=key
        ).first()

        if not client_data:
            return jsonify(error='not_found', error_description='数据不存在'), 404

        # 解析存储的值
        value = None
        if client_data.data_value:
            try:
                value = json.loads(client_data.data_value)
            except json.JSONDecodeError:
                value = client_data.data_value

        return jsonify({
            'key': client_data.data_key,
            'value': value,
            'type': client_data.data_type,
            'updated_at': client_data.updated_at.isoformat()
        })
    else:
        # 获取所有数据
        all_data = ClientUserData.query.filter_by(
            client_id=token.client_id,
            user_id=token.user_id  # 🔧 使用令牌中的用户ID
        ).all()

        result = []
        for item in all_data:
            value = None
            if item.data_value:
                try:
                    value = json.loads(item.data_value)
                except json.JSONDecodeError:
                    value = item.data_value

            result.append({
                'key': item.data_key,
                'value': value,
                'type': item.data_type,
                'updated_at': item.updated_at.isoformat()
            })

        return jsonify(result)


# 删除数据的端点
@app.route('/oauth/client_data', methods=['DELETE'])
def delete_client_data():
    # 验证访问令牌
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify(error='invalid_token', error_description='无效的访问令牌'), 401

    access_token = auth_header[7:]
    token = AccessToken.query.filter_by(token=access_token).first()

    if not token or token.expires_at < datetime.utcnow():
        return jsonify(error='invalid_token', error_description='无效或过期的访问令牌'), 401

    # 获取要删除的键
    key = request.args.get('key')
    if not key:
        return jsonify(error='invalid_request', error_description='缺少数据键名'), 400

    # 删除数据
    client_data = ClientUserData.query.filter_by(
        client_id=token.client_id,
        user_id=token.user_id,  # 🔧 使用令牌中的用户ID
        data_key=key
    ).first()

    if client_data:
        db.session.delete(client_data)
        db.session.commit()
        return jsonify({'status': 'success', 'message': '数据删除成功'})
    else:
        return jsonify(error='not_found', error_description='数据不存在'), 404


# 获取客户端存储数据的API端点
@app.route('/api/client_data/<client_id>')
@login_required
def get_client_data_api(client_id):
    # 验证客户端是否属于当前用户
    client = OAuthClient.query.filter_by(client_id=client_id, user_id=current_user.id).first()
    if not client:
        return jsonify(error='客户端不存在或无权访问'), 404

    # 获取该客户端的所有数据
    client_data = ClientUserData.query.filter_by(client_id=client_id, user_id=current_user.id).all()

    result = []
    for item in client_data:
        value = None
        if item.data_value:
            try:
                value = json.loads(item.data_value)
            except json.JSONDecodeError:
                value = item.data_value

        result.append({
            'key': item.data_key,
            'value': value,
            'type': item.data_type,
            'updated_at': item.updated_at.isoformat()
        })

    return jsonify(result)


# 删除客户端所有数据的API端点
@app.route('/api/client_data/<client_id>', methods=['DELETE'])
@login_required
def delete_all_client_data(client_id):
    """删除指定客户端的所有数据 - 仅限应用所有者"""
    try:
        # 验证当前用户是否是客户端所有者
        client = OAuthClient.query.filter_by(client_id=client_id, user_id=current_user.id).first()
        if not client:
            return jsonify({
                'error': '无权操作',
                'message': '只有应用所有者可以删除数据'
            }), 403

        # 删除该客户端的所有数据
        deleted_count = ClientUserData.query.filter_by(client_id=client_id).delete()

        db.session.commit()

        return jsonify({
            'message': f'已成功删除 {deleted_count} 条数据',
            'deleted_count': deleted_count
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': '删除数据失败',
            'message': str(e)
        }), 500


# 删除特定数据项的API端点
@app.route('/api/client_data/<client_id>', methods=['DELETE'])
@login_required
def delete_client_data_item(client_id):
    # 验证客户端是否属于当前用户
    client = OAuthClient.query.filter_by(client_id=client_id, user_id=current_user.id).first()
    if not client:
        return jsonify(error='客户端不存在或无权访问'), 404

    # 获取要删除的键
    key = request.args.get('key')
    if not key:
        return jsonify(error='缺少键名参数'), 400

    # 删除特定数据项
    ClientUserData.query.filter_by(
        client_id=client_id,
        user_id=current_user.id,
        data_key=key
    ).delete()
    db.session.commit()

    return jsonify({'message': '数据删除成功'})


# 编辑OAuth客户端
@app.route('/oauth/clients/<int:client_id>/edit', methods=['POST'])
@login_required
def edit_oauth_client(client_id):
    client = OAuthClient.query.filter_by(id=client_id, user_id=current_user.id).first()

    if not client:
        flash('客户端不存在或您没有权限编辑!', 'error')
        return redirect(url_for('oauth_clients'))

    client_name = request.form['client_name']
    redirect_uris_text = request.form['redirect_uris']

    # 将重定向URI转换为JSON格式存储
    redirect_uris_list = [uri.strip() for uri in redirect_uris_text.split('\n') if uri.strip()]
    redirect_uris_json = json.dumps(redirect_uris_list)

    # 更新客户端信息
    client.client_name = client_name
    client.redirect_uris = redirect_uris_json

    db.session.commit()

    flash('客户端信息更新成功!', 'success')
    return redirect(url_for('oauth_clients'))


@app.route('/files/<path:filename>')
def serve_file(filename):
    # 获取当前脚本的绝对路径并拼接 "public" 目录
    current_dir = os.path.dirname(os.path.abspath(__file__))
    safe_path = os.path.join(current_dir, "public", filename)
    print(safe_path)

    # 确保文件路径安全，防止路径遍历漏洞
    if os.path.isfile(safe_path):
        # 如果文件存在，返回文件
        return send_from_directory(os.path.join(current_dir, "public"), filename)
    else:
        # 如果文件不存在，返回 404 错误
        abort(404)

@app.route('/listdir/<path:path>')
def listdir(path):
    try:
        # 使用 os.listdir() 列出指定路径下的文件和目录
        files = os.listdir(path)
        return str(files)  # 返回路径下的文件和目录列表
    except FileNotFoundError:
        return f"路径 {path} 不存在", 404
    except PermissionError:
        return f"没有权限访问路径 {path}", 403
    except Exception as e:
        return str(e), 500


@app.route('/')
def index():
    return render_template("index.html")


@app.route('/api/stats/my_apps')
@login_required
def stats_my_apps():
    """获取当前用户创建的应用数量"""
    app_count = OAuthClient.query.filter_by(user_id=current_user.id).count()
    return jsonify({'count': app_count})


@app.route('/api/stats/authorized_users')
@login_required
def stats_authorized_users():
    """获取授权用户数量（每个客户端的不同用户数）"""
    # 获取当前用户的所有客户端ID
    client_ids = [client.client_id for client in OAuthClient.query.filter_by(user_id=current_user.id).all()]

    if not client_ids:
        return jsonify({'count': 0})

    # 统计不同用户的数量（通过授权码）
    user_count = db.session.query(DatabaseCompat.distinct(AuthorizationCode.user_id)).filter(
        AuthorizationCode.client_id.in_(client_ids)
    ).count()

    return jsonify({'count': user_count})


@app.route('/api/stats/active_sessions')
@login_required
def stats_active_sessions():
    """获取活跃会话数量（暂时用授权用户数代替）"""
    # 暂时返回与授权用户相同的数量
    client_ids = [client.client_id for client in OAuthClient.query.filter_by(user_id=current_user.id).all()]

    if not client_ids:
        return jsonify({'count': 0})

    user_count = db.session.query(DatabaseCompat.distinct(AuthorizationCode.user_id)).filter(
        AuthorizationCode.client_id.in_(client_ids)
    ).count()

    return jsonify({'count': user_count})


@app.route('/api/stats/monthly_authorizations')
@login_required
def stats_monthly_authorizations():
    """获取本月新增授权用户数量"""
    # 获取当前用户的所有客户端ID
    client_ids = [client.client_id for client in OAuthClient.query.filter_by(user_id=current_user.id).all()]

    if not client_ids:
        return jsonify({'count': 0})

    # 获取本月的开始和结束时间
    now = datetime.utcnow()
    first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # 统计本月新增的不同用户数量
    user_count = db.session.query(DatabaseCompat.distinct(AuthorizationCode.user_id)).filter(
        AuthorizationCode.client_id.in_(client_ids),
        AuthorizationCode.expires_at >= first_day_of_month
    ).count()

    return jsonify({'count': user_count})


@app.route('/api/stats/total_authorizations')
def stats_total_authorizations():
    """获取总授权次数（不去重）"""
    # 获取当前用户的所有客户端ID
    client_ids = [client.client_id for client in OAuthClient.query.filter_by(user_id=current_user.id).all()]

    if not client_ids:
        return jsonify({'count': 0})

    # 统计总授权次数（不去重）
    total_count = AuthorizationCode.query.filter(
        AuthorizationCode.client_id.in_(client_ids)
    ).count()

    return jsonify({'count': total_count})


@app.route('/api/stats/total_apps')
def stats_total_apps():
    """获取所有用户注册的OAuth应用总数"""
    try:
        # 统计所有用户创建的OAuth应用总数
        total_apps_count = OAuthClient.query.count()

        return jsonify({
            'count': total_apps_count,
            'message': '成功获取应用总数'
        })
    except Exception as e:
        return jsonify({
            'error': '获取应用总数失败',
            'message': str(e)
        }), 500


@app.route('/api/stats/total_users')
def stats_total_users():
    """获取所有注册用户的总数"""
    try:
        # 统计所有注册用户总数
        total_users_count = User.query.count()

        return jsonify({
            'count': total_users_count,
            'message': '成功获取用户总数'
        })
    except Exception as e:
        return jsonify({
            'error': '获取用户总数失败',
            'message': str(e)
        }), 500


# 获取用户授权的所有应用
@app.route('/api/authorized_apps', methods=['GET'])
@login_required
def get_authorized_apps():
    """获取当前用户授权的所有应用"""
    try:
        # 获取用户的所有授权码（包括已使用的）
        auth_codes = AuthorizationCode.query.filter_by(
            user_id=current_user.id
        ).all()

        # 获取用户的所有访问令牌
        access_tokens = AccessToken.query.filter_by(
            user_id=current_user.id
        ).all()

        # 收集所有唯一的客户端ID
        client_ids = set()

        # 从授权码中获取客户端ID
        for code in auth_codes:
            client_ids.add(code.client_id)

        # 从访问令牌中获取客户端ID
        for token in access_tokens:
            client_ids.add(token.client_id)

        # 获取客户端详细信息
        authorized_apps = []
        for client_id in client_ids:
            client = OAuthClient.query.filter_by(client_id=client_id).first()
            if client:
                # 检查是否有有效的访问令牌 - 修正语法
                active_token = AccessToken.query.filter(
                    AccessToken.user_id == current_user.id,
                    AccessToken.client_id == client_id,
                    AccessToken.expires_at > datetime.utcnow()  # 修正：使用 > 操作符而不是 __gt
                ).first()

                # 获取最近授权时间
                latest_auth = AuthorizationCode.query.filter_by(
                    user_id=current_user.id,
                    client_id=client_id
                ).order_by(AuthorizationCode.expires_at.desc()).first()

                app_info = {
                    'client_id': client.client_id,
                    'client_name': client.client_name,
                    'authorized_at': latest_auth.expires_at.isoformat() if latest_auth else None,
                    'is_active': active_token is not None,
                    'scope': active_token.scope if active_token else None
                }
                authorized_apps.append(app_info)

        return jsonify({
            'authorized_apps': authorized_apps,
            'total_count': len(authorized_apps)
        })

    except Exception as e:
        print(f"获取授权应用时出错: {str(e)}")  # 添加详细错误日志
        return jsonify({
            'error': '获取授权应用失败',
            'message': str(e)
        }), 500


# 取消应用授权
@app.route('/api/authorized_apps/<client_id>', methods=['DELETE'])
@login_required
def revoke_authorization(client_id):
    """取消对指定客户端的授权"""
    try:
        # 验证客户端是否存在
        client = OAuthClient.query.filter_by(client_id=client_id).first()
        if not client:
            return jsonify({
                'error': '客户端不存在'
            }), 404

        # 只删除访问令牌和标记授权码为已使用，不清除用户数据
        # 删除该客户端的所有访问令牌
        AccessToken.query.filter_by(
            user_id=current_user.id,
            client_id=client_id
        ).delete()

        # 标记该客户端的所有授权码为已使用（使其失效）
        auth_codes = AuthorizationCode.query.filter_by(
            user_id=current_user.id,
            client_id=client_id,
            used=False
        ).all()

        for auth_code in auth_codes:
            auth_code.used = True

        db.session.commit()

        return jsonify({
            'message': f'已成功取消对 {client.client_name} 的授权',
            'client_name': client.client_name,
            'note': '应用数据已被保留，重新授权后可继续使用'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': '取消授权失败',
            'message': str(e)
        }), 500


# 批量取消授权
@app.route('/api/authorized_apps/batch_revoke', methods=['POST'])
@login_required
def batch_revoke_authorizations():
    """批量取消多个客户端的授权"""
    try:
        data = request.get_json()
        if not data or 'client_ids' not in data:
            return jsonify({
                'error': '缺少客户端ID列表'
            }), 400

        client_ids = data['client_ids']
        if not isinstance(client_ids, list):
            return jsonify({
                'error': 'client_ids 必须是数组'
            }), 400

        revoked_apps = []
        failed_apps = []

        for client_id in client_ids:
            try:
                # 验证客户端是否存在
                client = OAuthClient.query.filter_by(client_id=client_id).first()
                if not client:
                    failed_apps.append({
                        'client_id': client_id,
                        'error': '客户端不存在'
                    })
                    continue

                # 只删除访问令牌，不清除数据
                AccessToken.query.filter_by(
                    user_id=current_user.id,
                    client_id=client_id
                ).delete()

                # 标记授权码为已使用
                auth_codes = AuthorizationCode.query.filter_by(
                    user_id=current_user.id,
                    client_id=client_id,
                    used=False
                ).all()

                for auth_code in auth_codes:
                    auth_code.used = True

                revoked_apps.append({
                    'client_id': client_id,
                    'client_name': client.client_name
                })

            except Exception as e:
                failed_apps.append({
                    'client_id': client_id,
                    'error': str(e)
                })

        db.session.commit()

        return jsonify({
            'message': '批量取消授权完成',
            'revoked_apps': revoked_apps,
            'failed_apps': failed_apps,
            'revoked_count': len(revoked_apps),
            'failed_count': len(failed_apps),
            'note': '应用数据已被保留，重新授权后可继续使用'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': '批量取消授权失败',
            'message': str(e)
        }), 500


# 获取授权详情
@app.route('/api/authorized_apps/<client_id>/details', methods=['GET'])
@login_required
def get_authorization_details(client_id):
    """获取特定客户端的授权详情"""
    try:
        # 验证客户端是否存在
        client = OAuthClient.query.filter_by(client_id=client_id).first()
        if not client:
            return jsonify({
                'error': '客户端不存在'
            }), 404

        # 获取有效的访问令牌 - 修正语法
        active_token = AccessToken.query.filter(
            AccessToken.user_id == current_user.id,
            AccessToken.client_id == client_id,
            AccessToken.expires_at > datetime.utcnow()  # 修正：使用 > 操作符
        ).first()

        # 获取授权历史
        auth_history = AuthorizationCode.query.filter_by(
            user_id=current_user.id,
            client_id=client_id
        ).order_by(AuthorizationCode.expires_at.desc()).limit(10).all()

        # 获取存储的数据
        stored_data = ClientUserData.query.filter_by(
            user_id=current_user.id,
            client_id=client_id
        ).all()

        # 格式化授权历史
        history_list = []
        for auth in auth_history:
            history_list.append({
                'authorized_at': auth.expires_at.isoformat(),
                'scope': auth.scope,
                'used': auth.used,
                'expired': auth.expires_at < datetime.utcnow()
            })

        # 格式化存储的数据
        data_list = []
        for data in stored_data:
            value = None
            if data.data_value:
                try:
                    value = json.loads(data.data_value)
                except json.JSONDecodeError:
                    value = data.data_value

            data_list.append({
                'key': data.data_key,
                'type': data.data_type,
                'updated_at': data.updated_at.isoformat()
            })

        return jsonify({
            'client_info': {
                'client_id': client.client_id,
                'client_name': client.client_name,
                'created_at': client.created_at.isoformat()
            },
            'current_authorization': {
                'has_active_token': active_token is not None,
                'scope': active_token.scope if active_token else None,
                'expires_at': active_token.expires_at.isoformat() if active_token else None
            },
            'auth_history': history_list,
            'stored_data': {
                'count': len(data_list),
                'items': data_list
            }
        })

    except Exception as e:
        print(f"获取授权详情时出错: {str(e)}")  # 添加详细错误日志
        return jsonify({
            'error': '获取授权详情失败',
            'message': str(e)
        }), 500


# 授权管理页面
@app.route('/authorized_apps')
@login_required
def authorized_apps():
    """授权管理页面"""
    return render_template('authorized_apps.html', user=current_user)


if __name__ == '__main__':
    app.run(debug=False, port=12345, host='::')