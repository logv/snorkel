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

virtualenv2:
				virtualenv dev2 -p python2
virtualenv3:
				virtualenv dev3 -p python3

virtualenv: virtualenv2 virtualenv3

binary2:
				rm dist/*whl; \
				. dev2/bin/activate; \
				python setup.py bdist_wheel; \
				echo ${PWD}; \
				mv dist/snorkel_lite*whl dist/current/snorkel_lite-current-py2-none-any.whl

binary3:
				rm dist/*whl; \
				. dev3/bin/activate; \
				python setup.py bdist_wheel; \
				echo ${PWD}; \
				mv dist/snorkel_lite*whl dist/current/snorkel_lite-current-py3-none-any.whl

macosx2:
				rm dist/*whl; \
				. dev2/bin/activate; \
				MACOSX_BUILD=y python setup.py bdist_wheel -p macosx_10_11_x86_64; \
				echo ${PWD}; \
				mv dist/snorkel_lite*whl dist/current/

macosx3:
				rm dist/*whl; \
				. dev3/bin/activate; \
				MACOSX_BUILD=y python setup.py bdist_wheel -p macosx_10_11_x86_64; \
				echo ${PWD}; \
				mv dist/snorkel_lite*whl dist/current/

binary-package: binary2 binary3 macosx2 macosx3



upload2:
				. dev2/bin/activate; \
				python setup.py bdist_wheel -p manylinux1_x86_64 upload; \

upload3:
				. dev3/bin/activate; \
				python setup.py bdist_wheel -p manylinux1_x86_64 upload; \

uploadosx2:
				. dev2/bin/activate; \
				MACOSX_BUILD=y python setup.py bdist_wheel -p macosx_10_11_x86_64 upload;

uploadosx3:
				. dev3/bin/activate; \
				MACOSX_BUILD=y python setup.py bdist_wheel -p macosx_10_11_x86_64 upload;

upload-package: upload2 upload3 uploadosx2 uploadosx3

source-package:
				python setup.py sdist build
				cp dist/snorkel-lite-${VERSION}.tar.gz dist/snorkel-lite-current.tar.gz

docker2:
				docker build . --tag e2e_snorkel2 -f dockers/Dockerfile.py2

docker3:
				docker build . --tag e2e_snorkel3 -f dockers/Dockerfile.py3

dockercypress:
				docker build . --tag e2e_cypress -f dockers/Dockerfile.cypress

cypress: docker2 docker3
				. scripts/run_e2e_py2_tests.sh
				. scripts/run_e2e_py3_tests.sh

.PHONY: tags clean build cscope run dev docker2 docker3
