import logging
import os

import requests
import tornado
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join

logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)1.1s %(asctime)s.%(msecs)03d %(module)s:%(lineno)d] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

hub_prefix = os.environ.get('JUPYTERHUB_BASE_URL', '/')
kore_url = f'http://127.0.0.1:10001/{hub_prefix.replace("/", "")}/services/kore'


class KoreExtensionTitleHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    def get(self):
        url = f'{kore_url}/title'

        params = {'user': self.current_user.username}
        response = requests.get(url=url, params=params)

        self.set_status(status_code=response.status_code)
        self.finish(response.json())


class KoreExtensionGradeHandler(APIHandler):
    @tornado.web.authenticated
    def post(self):
        url = f'{kore_url}/grades'

        payload = {'user': self.current_user.username}
        response = requests.post(url=url, json=payload)

        self.set_status(status_code=response.status_code)
        self.finish(response.json())


class KoreExtensionCourseHandler(APIHandler):
    @tornado.web.authenticated
    def get(self, subroute=None):
        base_url = f'{kore_url}/courses'

        if subroute == "active":
            url = f'{base_url}/active'
        elif subroute == "other":
            url = f'{base_url}/other'
        else:
            url = base_url

        params = {'user': self.current_user.username}
        response = requests.get(url=url, params=params)

        self.set_status(status_code=response.status_code)
        self.finish(response.json())

    @tornado.web.authenticated
    def post(self):
        url = f'{kore_url}/courses'

        payload = {
            'user': self.current_user.username,
            'fromPath': self.get_json_body()['fromPath'],
            'toPath': self.get_json_body()['toPath']
        }
        response = requests.post(url=url, json=payload)

        self.set_status(status_code=response.status_code)
        self.finish(response.json())

    @tornado.web.authenticated
    def put(self):
        url = f'{kore_url}/courses'

        payload = {
            'user': self.current_user.username,
            'path': self.get_json_body()['path'],
            'name': self.get_json_body()['name']
        }
        response = requests.put(url=url, json=payload)

        self.set_status(status_code=response.status_code)
        self.finish(response.json())

    @tornado.web.authenticated
    def patch(self):
        url = f'{kore_url}/courses'

        payload = {
            'user': self.current_user.username,
            'path': self.get_json_body()['path']
        }
        response = requests.patch(url=url, json=payload)

        self.set_status(status_code=response.status_code)
        self.finish(response.json())

    @tornado.web.authenticated
    def delete(self):
        url = f'{kore_url}/courses'

        payload = {
            'user': self.current_user.username,
            'path': self.get_json_body()['path']
        }
        response = requests.delete(url=url, json=payload)

        self.set_status(status_code=response.status_code)
        self.finish(response.json())


class KoreExtensionAssignmentHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        url = f'{kore_url}/assignments'

        params = {'user': self.current_user.username}
        response = requests.get(url=url, params=params)

        self.set_status(status_code=response.status_code)
        self.finish(response.json())

    @tornado.web.authenticated
    def post(self):
        url = f'{kore_url}/assignments'

        payload = {
            'user': self.current_user.username,
            'path': self.get_json_body()['path']
        }
        response = requests.post(url=url, json=payload)

        self.set_status(status_code=response.status_code)
        self.finish(response.json())


class KoreExtensionProblemsHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        url = f'{kore_url}/problems'

        params = {'user': self.current_user.username}
        response = requests.get(url=url, params=params)

        self.set_status(status_code=response.status_code)
        self.finish(response.json())

    @tornado.web.authenticated
    def post(self):
        url = f'{kore_url}/problems'

        payload = {
            'user': self.current_user.username,
            'path': self.get_json_body()['path']
        }
        response = requests.post(url=url, json=payload)

        self.set_status(status_code=response.status_code)
        self.finish(response.json())


def setup_handlers(web_app):
    host_pattern = '.*$'
    base_url = web_app.settings['base_url']

    handlers = [
        # Prepend the base_url so that it works in a JupyterHub setting
        (url_path_join(base_url, 'kore-extension', 'title'), KoreExtensionTitleHandler),
        (url_path_join(base_url, 'kore-extension', 'grades'), KoreExtensionGradeHandler),
        (url_path_join(base_url, 'kore-extension', 'courses/(active|other)?'), KoreExtensionCourseHandler),
        (url_path_join(base_url, 'kore-extension', 'courses'), KoreExtensionCourseHandler),
        (url_path_join(base_url, 'kore-extension', 'assignments'), KoreExtensionAssignmentHandler),
        (url_path_join(base_url, 'kore-extension', 'problems'), KoreExtensionProblemsHandler)
    ]

    web_app.add_handlers(host_pattern, handlers)
