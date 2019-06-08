FROM alpine

RUN apk add bash coreutils
RUN apk add python3 gcc g++ go
RUN apk add py-future
RUN apk add python3-dev
RUN apk add libffi-dev

COPY dist/snorkel_lite-current-py3-none-any.whl /root/
RUN pip3 install /root/snorkel_lite-current-py3-none-any.whl
COPY e2e/* /e2e/
