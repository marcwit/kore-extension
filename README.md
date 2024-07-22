# kore_extension

A JupyterLab extension to expand the eponymous service for course management and grade handling between LMS and JupyterHub via LTI 1.3.

This extension is composed of a Python package named `kore_extension`
for the server extension and a NPM package named `kore_extension`
for the frontend extension.

## Requirements

- Install miniconda and create a virtual environment
- JupyterLab >= 4.0.0
- NodeJS >= 20.0.0
- Copier >= 9.0.0
- jinja2-time
> **Note**
> conda install -c conda-forge jupyterlab=4 nodejs=20 copier=9 jinja2-time
- Initialize template
> **Note**
> copier copy --trust https://github.com/jupyterlab/extension-template .

## Install

To install the extension, execute:

```bash
pip install kore_extension
```

## Uninstall

To remove the extension, execute:

```bash
pip uninstall kore_extension
```

## Troubleshoot

If you are seeing the frontend extension, but it is not working, check
that the server extension is enabled:

```bash
jupyter server extension list
```

If the server extension is installed and enabled, but you are not seeing
the frontend extension, check the frontend extension is installed:

```bash
jupyter labextension list
```

## Contributing

### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
pip install -ve .
jupyter labextension develop . --overwrite
jlpm build
```

See the initial extension in action

```bash
jupyter lab
```

### Development uninstall

```bash
# Server extension must be manually disabled in develop mode
jupyter server extension disable kore_extension
pip uninstall kore_extension
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `kore_extension` within that folder.

### Package the extension

Use `python -m build` or `python -m build -s` to generate a pacakge under `dist/`.

#### Server tests

This extension is using [Pytest](https://docs.pytest.org/) for Python code testing.

Install test dependencies (needed only once):

```sh
pip install -e ".[test]"
# Each time you install the Python package, you need to restore the front-end extension link
jupyter labextension develop . --overwrite
```

To execute them, run:

```sh
pytest -vv -r ap --cov kore_extension
```

#### Frontend tests

This extension is using [Jest](https://jestjs.io/) for JavaScript code testing.

To execute them, execute:

```sh
jlpm
jlpm test
```

#### Integration tests

This extension uses [Playwright](https://playwright.dev/docs/intro) for the integration tests (aka user level tests).
More precisely, the JupyterLab helper [Galata](https://github.com/jupyterlab/jupyterlab/tree/master/galata) is used to handle testing the extension in JupyterLab.

More information are provided within the [ui-tests](./ui-tests/README.md) README.

### Packaging the extension

See [RELEASE](RELEASE.md)

## Code

On the following line the extension shall be explained and files where changes are made are listed.
