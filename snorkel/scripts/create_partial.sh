#!/bin/bash

if [[ $# == 0 ]] ; then
  echo "Usage: $) [controller] partial"
  echo ""
  echo "Creates a new partial under the helper (or controller) directory with"
  echo "name partial.html.erb"
fi

CONTROLLER=""
if [[ $# == 1 ]] ; then
  PARTIAL="$1"
  DEST=app/static/templates/helpers/${CONTROLLER}/
fi

if [[ $# == 2 ]] ; then
  
  CONTROLLER="$1"
  PARTIAL="$2"

  DEST=app/static/templates/partials/${CONTROLLER}/
fi

mkdir -p $DEST 
cat > ${DEST}/${PARTIAL}.html.erb << TEMPLATE

  <h2>A partial named marshall</h2>

  Maybe it should be replaced by something else?

TEMPLATE

echo "Created partial ${DEST}/${PARTIAL}.html.erb"
