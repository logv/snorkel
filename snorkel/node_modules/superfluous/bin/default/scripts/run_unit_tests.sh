FAIL=0

echo "Running core unit tests"
mocha core/server/test || FAIL=1
echo "Running app unit tests"
mocha app/server/test || FAIL=1
exit $FAIL
