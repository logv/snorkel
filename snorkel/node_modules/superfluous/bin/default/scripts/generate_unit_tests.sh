#!/usr/bin/env bash

TEST_PATH=${1}
FILES_IN_PATH="/bin/ls ${TEST_PATH}"
FILES=`${FILES_IN_PATH}`

mkdir -p ${TEST_PATH}/test > /dev/null

for f in ${FILES}; do
  echo $f | grep "\.js" > /dev/null
  is_js=$?
  test_path="${TEST_PATH}/test/${f}"

  test -f $test_path
  test_exists=$?
  if [[ $test_exists != 0 ]]; then
    if [[ $is_js == 0 ]]; then
      echo "Creating test for $f"
      node core/server/test_helper.js ${TEST_PATH}/${f} > ${test_path}
    fi
  else
    echo "Test already exists for $f, not creating test file";
  fi
done

