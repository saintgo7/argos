```markdown
# argos Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `argos` TypeScript codebase. It covers file naming, import/export styles, commit message conventions, and testing patterns. This guide is designed to help contributors quickly align with the project's standards for clean, maintainable code.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `userProfile.ts`, `dataFetcher.ts`

### Import Style
- Use **relative imports** for modules within the project.
  - Example:
    ```typescript
    import fetchData from './fetchData';
    ```

### Export Style
- Use **default exports** for modules.
  - Example:
    ```typescript
    // In fetchData.ts
    export default function fetchData() { ... }
    ```

### Commit Message Conventions
- Follow **Conventional Commits**.
- Common prefixes: `feat`, `chore`, `docs`
- Keep commit messages concise (average ~56 characters).
  - Example:
    ```
    feat: add user authentication middleware
    chore: update dependencies
    docs: add API usage examples
    ```

## Workflows

_No automated workflows detected in this repository._

## Testing Patterns

- Test files follow the pattern: `*.test.*`
  - Example: `userProfile.test.ts`
- Testing framework is **unknown**, but tests are colocated with source files or in the same directory.
- To run tests, use the project's standard TypeScript test runner (consult project documentation or package.json for specifics).

  ```typescript
  // Example test file: mathUtils.test.ts
  import add from './add';

  test('adds two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });
  ```

## Commands
| Command     | Purpose                                      |
|-------------|----------------------------------------------|
| /test       | Run all test files matching `*.test.*`       |
| /commit     | Generate a conventional commit message       |
| /format     | Format code according to project conventions |
```