from os import path
from flask import Flask, request

PLUGIN_INTRODUCTION = "对admin提供执行python代码功能"
PLUGIN_NAME = "Exec Python Code"


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
        @self.app.route("/run_python_code", methods=["POST"])
        @self.admin_required
        def exec_python_code():
            code = request.get_json().get("code")
            exec(code, self.g)

            return ""
