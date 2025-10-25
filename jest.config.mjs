import nextJest from "next/jest.js";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pathsToModuleNameMapper } from "ts-jest";

const createJestConfig = nextJest({
  dir: "./",
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tsconfig = JSON.parse(
  readFileSync(path.join(__dirname, "tsconfig.json"), "utf8")
);

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths ?? {}, {
    prefix: "<rootDir>/",
  }),
};

export default createJestConfig(customJestConfig);
