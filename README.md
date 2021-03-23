SonarQube/SonarCloud Azure Pipelines Extension
========================================

[![Build Status](https://dev.azure.com/sonarsource/_apis/public/build/definitions/399fb241-ecc7-4802-8697-dcdd01fbb832/10/badge)](https://dev.azure.com/sonarsource/DotNetTeam%20Project/_build/index?definitionId=10)

Marketplace
-----------

https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarqube
https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarcloud

Have Question or Feedback?
--------------------------

For support questions ("How do I?", "I got this error, why?", ...), please head to the [SonarSource forum](https://community.sonarsource.com/c/help). There are chances that a question similar to yours has already been answered. 

Be aware that this forum is a community, so the standard pleasantries ("Hi", "Thanks", ...) are expected. And if you don't get an answer to your thread, you should sit on your hands for at least three days before bumping it. Operators are not standing by. :-)


Contributing
------------

If you would like to see a new feature, please create a new thread in the forum ["Suggest new features"](https://community.sonarsource.com/c/suggestions/features).

Please be aware that we are not actively looking for feature contributions. The truth is that it's extremely difficult for someone outside SonarSource to comply with our roadmap and expectations. Therefore, we typically only accept minor cosmetic changes and typo fixes.

With that in mind, if you would like to submit a code contribution, please create a pull request for this repository. Please explain your motives to contribute this change: what problem you are trying to fix, what improvement you are trying to make.

Make sure that you follow our [code style](https://github.com/SonarSource/sonar-developer-toolset#code-style) and all tests are passing (Travis build is executed for each pull request).


Developer documentation
-----------------------

### How to set the environment

* Install NPM / Node.js
* npm install -g tfx-cli
* npm install

### Package a production build

* npm run build

### Package a test build

* npm run test-build -- --publisher name

### Run tests

* npm test

License
-------

Copyright 2017-2020 SonarSource.

Licensed under the [GNU Lesser General Public License, Version 3.0](http://www.gnu.org/licenses/lgpl.txt))