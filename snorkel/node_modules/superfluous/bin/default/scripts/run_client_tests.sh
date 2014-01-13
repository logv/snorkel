FAIL=0

which phantomjs > /dev/null
HAS_PHANTOMJS=$?

which mocha-phantomjs > /dev/null
HAS_MOCHA_PHANTOM=$?

if [[ $HAS_PHANTOMJS == 0 && $HAS_MOCHA_PHANTOM == 0 ]]; then
  echo "Starting server for client tests on 4200"
  HTTPS_PORT=4300 PORT=4200 node app > /dev/null &
  PID=$!
  sleep 1
  echo "Running client tests"
  mocha-phantomjs http://localhost:4200/tester || FAIL=1
  kill $PID
else
  echo "WARNING: Couldn't find phantomjs, skipping client tests"
fi

exit $FAIL
