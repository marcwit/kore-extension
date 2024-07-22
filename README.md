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

## Development install

```terminal
pip install -ve .
jupyter labextension develop . --overwrite
jlpm build
```

## Code

On the following line the extension shall be explained and files where changes are made are listed.

In `kore_extension/handlers.py` the routes are defined.
In `schema/plugin.json` the layout of the extension is defined.
In `src/index.ts` the behaviour is defined.

For testing generate package with `jlpm install`, `jlpm run build` and `python -m build`.
Copy package to server and install it in the podman container under the `jhub` environment.

```terminal
source /opt/conda/etc/profile.d/conda.sh; conda activate jhub
pip install kore_extension-0.1.0-py3-none-any.whl
```