#!/bin/bash

COMPONENT="${1}"

mkdir react/${COMPONENT}
cp react/react_template/* react/${COMPONENT}

cd react/${COMPONENT}
rename s/template/${COMPONENT}/ *
sed -i "s/TEMPLATE/${COMPONENT}/g" package.json
sed -i "s/TEMPLATE/${COMPONENT}/g" *.js
