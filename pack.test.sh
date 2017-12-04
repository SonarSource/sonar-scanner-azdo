#!/bin/sh

// TODO Copy the correct logo from tasks/common/icon.test.png to each task folder
// TODO Copy common/v3/SonarQubeHelper.ps1 to each v3 task folder
// TODO unzip the scanner-cli distribution in the scanner-cli task folder

publisher=jhsonarsource

tfx extension create --publisher=Foo --overridesFile vss-extension.test.json --publisher "$publisher"