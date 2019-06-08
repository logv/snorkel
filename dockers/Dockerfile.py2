FROM alpine

RUN apk add bash coreutils
RUN apk add python2 python3 gcc g++ go
RUN apk add py-future py2-pip
RUN apk add python2-dev
RUN apk add libffi-dev

COPY dist/snorkel_lite-current-py2-none-any.whl /root/
RUN pip2 install /root/snorkel_lite-current-py2-none-any.whl
COPY e2e/* /e2e/
