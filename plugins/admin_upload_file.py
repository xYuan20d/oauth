from os import path
from flask import Flask, request, jsonify

PLUGIN_INTRODUCTION = "对admin提供文件上传接口"
PLUGIN_NAME = "Upload File"

class Plugin:
    def __init__(self, main_globals: dict):
        self.g = main_globals
        self.app: Flask = self.g["app"]

        self.plugin_manager = self.g["plugin_manager"]
        self.plugin_dir = self.g["PLUGINS_DIR"]

        self.admin_required = self.g["admin_required"]
        self.is_admin = self.g["is_admin"]

        self.files_path = \
            path.join(path.dirname(__file__), "all_plugin_files", path.splitext(path.basename(__file__))[0])

class InitRoute(Plugin):
    def __init__(self, main_globals: dict):
        super().__init__(main_globals)

    def init_route(self):
        @self.app.route("/uploadFile", methods=["POST"])
        @self.admin_required
        def upload():
            # 获取 URL 查询参数中的路径
            upload_folder = request.args.get('path', None)

            if not upload_folder:
                return jsonify({'error': '没有指定上传路径'}), 400

            if 'file' not in request.files:
                return jsonify({'error': '没有文件部分'}), 400

            file = request.files['file']
            if file:
                file.save(path.join(upload_folder, file.filename))
                return jsonify({'message': '文件上传成功'}), 200
            else:
                return jsonify({'error': '不支持的文件类型'}), 400
