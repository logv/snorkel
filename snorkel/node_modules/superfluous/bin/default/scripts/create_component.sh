#!/bin/bash

COMPONENT="${1}"

mkdir components/${COMPONENT}
cp components/template/* components/${COMPONENT} -R

cd components/${COMPONENT}
rename s/template/${COMPONENT}/ *
sed -i "s/TEMPLATE/${COMPONENT}/g" package.json
sed -i "s/TEMPLATE/${COMPONENT}/g" *.js
