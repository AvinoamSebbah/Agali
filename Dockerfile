#syntax=docker/dockerfile:1

FROM node:20.19.5-bookworm-slim as base
ARG PY_VERSION="3.11.0"

# -------------------------------
# 1️⃣ Installer les paquets système et CA
# -------------------------------
RUN apt-get update --fix-missing -y && \
    apt-get install -y \
        cron \
        libxml2-dev \
        libxslt-dev \
        git \
        libbz2-dev \
        libncurses-dev \
        libreadline-dev \
        libffi-dev \
        libssl-dev \
        python3-pip \
        wget \
        ca-certificates && \
    update-ca-certificates && \
    apt-get clean && apt-get autoremove -y

# -------------------------------
# 2️⃣ Configurer pyenv et Python
# -------------------------------
ENV HOME="/root"
WORKDIR ${HOME}
RUN git clone --depth=1 https://github.com/pyenv/pyenv.git .pyenv
ENV PYENV_ROOT="${HOME}/.pyenv"
ENV PATH="${PYENV_ROOT}/shims:${PYENV_ROOT}/bin:${PATH}"

RUN pyenv install $PY_VERSION
RUN pyenv global $PY_VERSION

# -------------------------------
# 3️⃣ Installer pip, certifi et ton projet
# -------------------------------
WORKDIR /usr/src/app
COPY . .

# mettre pip et certifi à jour + trusted-host pour éviter SSL durant build
RUN python -m pip install --upgrade pip certifi --trusted-host pypi.org --trusted-host files.pythonhosted.org

# installer ton projet avec trusted-host pour pip
RUN python -m pip install . --trusted-host pypi.org --trusted-host files.pythonhosted.org

VOLUME ["/usr/src/app/dumps"]

# -------------------------------
# 4️⃣ Développement
# -------------------------------
FROM base as dev
RUN pip install black pylint --trusted-host pypi.org --trusted-host files.pythonhosted.org

# -------------------------------
# 5️⃣ Production
# -------------------------------
FROM base as prod
# décommenter si tu veux cron
# ADD crontab /etc/cron.d
# RUN chmod 0644 /etc/cron.d/crontab
# RUN crontab /etc/cron.d/crontab
# RUN touch /var/log/cron.log
CMD ["python", "main.py"]

# -------------------------------
# 6️⃣ Test / Playwright
# -------------------------------
FROM base as test
RUN npx -y playwright@1.53.0 install --with-deps
RUN python -m playwright install

RUN python -m pip install . ".[test]" --trusted-host pypi.org --trusted-host files.pythonhosted.org
CMD ["python", "-m", "pytest", "-vv", "-n", "2"]
