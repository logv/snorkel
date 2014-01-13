FAIL=0
for component in components/*; do 
  if test -f ${component}/test/server.js; then
    if [[ ${component} == "components/template" ]]; then
      continue;
    fi

    echo "Running component tests for $component" 
    mocha ${component}/test/server || FAIL=1;

  fi
done
exit $FAIL
