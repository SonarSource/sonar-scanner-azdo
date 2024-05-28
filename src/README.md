## Creating a new common folder

When creating a new major version of tasks, each common folder should respect the following:

- It should contain a `config.ts` file exporting `msBuildVersion`, `cliVersion`, `classicUrl`, `dotnetUrl`
- It should contain its own `package.json` with its dependencies
- It should contain its own `jest.config.js`
- An associated `tsconfig.$extension-$version.json` should exist in `src`
- Files in `src/extensions/tasks/*/v*/*.ts` should be updated to use the updated common folder
