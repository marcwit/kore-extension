# kore_extension

A JupyterLab extension to expand the eponymous service for course management and grade handling between LMS and JupyterHub via LTI 1.3.

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
pip uninstall kore_extension
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `kore_extension` within that folder.

## Packaging the extension

Use `python -m build` or `python -m build -s` to generate a package in `dist/`.

### Testing the extension

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