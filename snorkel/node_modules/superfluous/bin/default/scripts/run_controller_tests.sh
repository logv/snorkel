FAIL=0
for controller in app/controllers/*; do 
  echo "Running controller tests for $controller"
  mocha $controller/test/server || FAIL=1;
done
exit $FAIL
