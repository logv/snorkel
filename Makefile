VERSION=`cat src/version.py | sed 's/__version__=//;s/"//g'`
ARCH="linux-x86_64"
default: tags cscope

run:
				python -m src.main

dev:
				TURBO_PUDGY=1 python -m src.main

setup: install-deps setup-db
setup-db:
				RESET=1 python src/models.py

install-deps:
				pip install -r requirements.txt

tags:
				ctags-exuberant -R src/

cscope:
				pycscope -R -S src/

sybil:
				mkdir -p build/go
				GOPATH=`readlink -f build/go` go get github.com/logv/sybil
				mkdir -p src/backend/bin/
				cp build/go/bin/sybil src/backend/bin/sybil

binary-package:
				python setup.py sdist build
				cp dist/snorkel-lite-${VERSION}.${ARCH}.tar.gz dist/snorkel-lite-current.${ARCH}.tar.gz

source-package:
				python setup.py sdist build
				cp dist/snorkel-lite-${VERSION}.tar.gz dist/snorkel-lite-current.tar.gz



.PHONY: tags clean build cscope run dev
