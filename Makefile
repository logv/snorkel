VERSION=`cat src/version.py | sed 's/__version__=//;s/"//g'`

default: tags cscope

package:
				python setup.py sdist build
				cp dist/snorkel-lite-${VERSION}.tar.gz dist/snorkel-lite-current.tar.gz

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


build-package:
				python setup.py sdist build

.PHONY: tags clean build cscope run dev
